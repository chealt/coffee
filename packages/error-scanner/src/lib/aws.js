import { execFileSync } from 'node:child_process';

// The AWS JS SDK returns empty results for describe-alarm-history here while the CLI
// returns the real entries, so the scanner shells out to the CLI instead.
const awsCli = (region, args) =>
  JSON.parse(execFileSync('aws', ['--region', region, ...args, '--output', 'json'], { encoding: 'utf8' }));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

const ERROR_QUERY =
  'fields @timestamp, @message | filter @message like /\\b(?i)(error|exception|unhandled|timed out|fail)\\b/ | sort @timestamp desc | limit 1000';

const queryLogErrors = async ({ region, logGroup, startTime, endTime }) => {
  const { queryId } = awsCli(region, [
    'logs',
    'start-query',
    '--log-group-name',
    logGroup,
    '--start-time',
    String(Math.floor(startTime / 1000)),
    '--end-time',
    String(Math.floor(endTime / 1000)),
    '--query-string',
    ERROR_QUERY
  ]);
  for (let attempt = 0; attempt < 30; attempt++) {
    const response = awsCli(region, ['logs', 'get-query-results', '--query-id', queryId]);
    if (response.status === 'Complete') {
      return (response.results ?? []).map((row) => {
        const field = (name) => row.find((entry) => entry.field === name)?.value ?? '';
        return { timestamp: field('@timestamp'), message: field('@message'), logGroup };
      });
    }
    if (['Failed', 'Cancelled', 'Timeout'].includes(response.status)) {
      throw new Error(`Logs Insights query ${queryId} ended with status ${response.status}`);
    }
    await sleep(2000);
  }
  throw new Error(`Logs Insights query ${queryId} did not complete in time`);
};

export { listFiredAlarms, queryLogErrors };
