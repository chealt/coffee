import { CloudWatchClient, DescribeAlarmsCommand } from '@aws-sdk/client-cloudwatch';

const listAlarmsInAlarm = async ({ region }) => {
  const cloudwatch = new CloudWatchClient({ region });
  const alarms = [];
  let nextToken;
  do {
    const response = await cloudwatch.send(new DescribeAlarmsCommand({ StateValue: 'ALARM', nextToken }));
    alarms.push(
      ...(response.metricAlarms ?? []).map((alarm) => ({
        name: alarm.alarmName,
        reason: alarm.stateReason ?? '',
        dimensions: (alarm.dimensions ?? []).map((dimension) => dimension.value).filter(Boolean)
      }))
    );
    nextToken = response.nextToken;
  } while (nextToken);
  return alarms;
};

export { listAlarmsInAlarm };
