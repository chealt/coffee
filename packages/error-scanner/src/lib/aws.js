import { execFileSync } from 'node:child_process';

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

const listAlarmTransitions = ({ region, since }) =>
  paginateCli(region, ['cloudwatch', 'describe-alarm-history', '--history-item-type', 'StateUpdate', '--start-date', since.toISOString().replace(/\.\d{3}Z$/, 'Z')], 'AlarmHistoryItems')
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
      return { name: item.AlarmName, timestamp: new Date(item.Timestamp), newState, reason };
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
    const latest = fired.reduce((acc, transition) => (acc && acc.timestamp >= transition.timestamp ? acc : transition), undefined);
    return {
      name,
      reason: latest?.reason ?? reasonByName.get(name) ?? '',
      dimensions: dimensionsByName.get(name) ?? [],
      occurrences: Math.max(fired.length, 1),
      lastTimestamp: latest?.timestamp ?? null
    };
  });
};

export { listFiredAlarms };
