import { execFileSync } from 'node:child_process';
import { CloudWatchLogsClient, FilterLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';

// The AWS JS SDK returns empty results for describe-alarm-history here while the CLI
// returns the real entries, so the scanner shells out to the CLI instead.
const awsCli = (region, args) =>
  JSON.parse(execFileSync('aws', ['--region', region, ...args, '--output', 'json'], { encoding: 'utf8' }));
const paginateCli = (region, args, itemsKey) => {
  const items = [];
  let nextToken;
  do {
    const response = awsCli(region, nextToken ? [...args, '--next-token', nextToken] : args);
    items.push(...(response[itemsKey] ?? []));
    nextToken = response.NextToken;
  } while (nextToken);
  return items;
};

const listAlarms = ({ region }) =>
  paginateCli(region, ['cloudwatch', 'describe-alarms'], 'MetricAlarms').map((alarm) => ({
    name: alarm.AlarmName,
    reason: alarm.StateReason ?? '',
    stateValue: alarm.StateValue,
    dimensions: (alarm.Dimensions ?? []).map((dimension) => dimension.Value).filter(Boolean)
  }));

const parseBreachTimes = (historyData) => {
  try {
    const state = JSON.parse(historyData ?? '{}').newState;
    let reasonData = state?.stateReasonData;
    if (typeof reasonData === 'string') {
      try {
        reasonData = JSON.parse(reasonData);
      } catch {
        reasonData = undefined;
      }
    }
    return (reasonData?.evaluatedDatapoints ?? [])
      .map((point) => Date.parse(point.timestamp))
      .filter((time) => Number.isFinite(time));
  } catch {
    return [];
  }
};

const listAlarmTransitions = ({ region, since }) =>
  paginateCli(
    region,
    [
      'cloudwatch',
      'describe-alarm-history',
      '--history-item-type',
      'StateUpdate',
      '--start-date',
      since.toISOString().replace(/\.\d{3}Z$/, 'Z')
    ],
    'AlarmHistoryItems'
  )
    .map((item) => {
      let newState;
      let reason = item.HistorySummary ?? '';
      try {
        const data = JSON.parse(item.HistoryData ?? '{}');
        newState = data.newState?.stateValue;
        reason = data.newState?.stateReason ?? reason;
      } catch {
        newState = undefined;
      }
      return {
        name: item.AlarmName,
        timestamp: new Date(item.Timestamp),
        newState,
        reason,
        breachTimes: parseBreachTimes(item.HistoryData)
      };
    })
    .filter((transition) => transition.newState === 'ALARM');

// Alarms that entered ALARM since the given time, plus ones still in ALARM now — a recovered
// burst between scans must still create a task, and a long-standing alarm's transition can
// predate the window.
const listFiredAlarms = ({ region, since }) => {
  const alarms = listAlarms({ region });
  const transitions = listAlarmTransitions({ region, since });
  const dimensionsByName = new Map(alarms.map((alarm) => [alarm.name, alarm.dimensions]));
  const reasonByName = new Map(alarms.map((alarm) => [alarm.name, alarm.reason]));
  const current = alarms.filter((alarm) => alarm.stateValue === 'ALARM').map((alarm) => alarm.name);
  const names = new Set([...current, ...transitions.map((transition) => transition.name)]);
  return [...names].map((name) => {
    const fired = transitions.filter((transition) => transition.name === name);
    const latest = fired.reduce(
      (acc, transition) => (acc && acc.timestamp >= transition.timestamp ? acc : transition),
      undefined
    );
    const breachTimes = [...new Set(fired.flatMap((transition) => transition.breachTimes))].sort((a, b) => a - b);
    return {
      name,
      reason: latest?.reason ?? reasonByName.get(name) ?? '',
      dimensions: dimensionsByName.get(name) ?? [],
      occurrences: Math.max(fired.length, 1),
      lastTimestamp: latest?.timestamp ?? null,
      breachTimes
    };
  });
};

// Token matching in filter patterns is case-sensitive, so cover the casings this
// codebase logs; the ?-prefixed terms and phrase form an OR
const ERROR_FILTER_PATTERN = '?ERROR ?error ?Exception ?exception ?fail ?FAIL ?unhandled ?Unhandled ?"timed out"';

const queryLogErrors = async ({ region, logGroup, startTime, endTime }) => {
  const logs = new CloudWatchLogsClient({ region });
  const entries = [];
  let nextToken;
  do {
    const response = await logs.send(
      new FilterLogEventsCommand({
        logGroupName: logGroup,
        startTime,
        endTime,
        filterPattern: ERROR_FILTER_PATTERN,
        nextToken
      })
    );
    entries.push(
      ...(response.events ?? []).map((event) => ({
        timestamp: new Date(event.timestamp).toISOString(),
        message: event.message,
        logGroup
      }))
    );
    nextToken = response.nextToken;
  } while (nextToken);
  return entries;
};

export { listFiredAlarms, queryLogErrors };
