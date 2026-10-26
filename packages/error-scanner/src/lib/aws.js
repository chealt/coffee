import { CloudWatchClient, DescribeAlarmHistoryCommand, DescribeAlarmsCommand } from '@aws-sdk/client-cloudwatch';

const mapAlarm = (alarm) => ({
  name: alarm.alarmName,
  reason: alarm.stateReason ?? '',
  stateValue: alarm.stateValue,
  dimensions: (alarm.dimensions ?? []).map((dimension) => dimension.value).filter(Boolean)
});

const listAlarms = async ({ region }) => {
  const cloudwatch = new CloudWatchClient({ region });
  const alarms = [];
  let nextToken;
  do {
    const response = await cloudwatch.send(new DescribeAlarmsCommand({ nextToken }));
    alarms.push(...(response.metricAlarms ?? []).map(mapAlarm));
    nextToken = response.nextToken;
  } while (nextToken);
  return alarms;
};

const listAlarmTransitions = async ({ region, since }) => {
  const cloudwatch = new CloudWatchClient({ region });
  const transitions = [];
  let nextToken;
  do {
    const response = await cloudwatch.send(
      new DescribeAlarmHistoryCommand({ HistoryItemType: 'Alarm', StartDate: since, nextToken })
    );
    for (const item of response.alarmHistoryItems ?? []) {
      let newState;
      let reason = item.historySummary ?? '';
      try {
        const data = JSON.parse(item.historyData ?? '{}');
        newState = data.newState;
        reason = data.stateRationale ?? reason;
      } catch {
        newState = undefined;
      }
      transitions.push({ name: item.alarmName, timestamp: item.timestamp, newState, reason });
    }
    nextToken = response.nextToken;
  } while (nextToken);
  return transitions.filter((transition) => transition.newState === 'ALARM');
};

// Alarms that entered ALARM since the given time, plus ones still in ALARM now — a recovered
// burst between scans must still create a task, and a long-standing alarm's transition can
// predate the window.
const listFiredAlarms = async ({ region, since }) => {
  const [alarms, transitions] = await Promise.all([
    listAlarms({ region }),
    listAlarmTransitions({ region, since })
  ]);
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
