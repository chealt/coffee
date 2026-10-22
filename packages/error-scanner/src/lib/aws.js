import { CloudWatchClient, DescribeAlarmsCommand } from '@aws-sdk/client-cloudwatch';
import {
  CloudWatchLogsClient,
  DescribeLogGroupsCommand,
  GetQueryResultsCommand,
  StartQueryCommand
} from '@aws-sdk/client-cloudwatch-logs';

// "exception" must not be followed by "al": Manhattan Coffee Roasters product URLs contain the
// category segment "/coffees/exceptional/", which otherwise trips the error filter on benign INFO logs.
// No lookaheads here: Logs Insights uses the Hyperscan engine, which does not support them.
const ERROR_PATTERN = '(?i)(error|exception([^a]|$)|unhandled|timed out|fail)';

const buildQueryString = (pattern) => `fields @timestamp, @message
| filter @message like /${pattern}/
| sort @timestamp desc
| limit 1000`;

const listLambdaLogGroups = async (logs) => {
  const groups = [];
  let nextToken;
  do {
    const response = await logs.send(new DescribeLogGroupsCommand({ logGroupNamePrefix: '/aws/lambda/', nextToken }));
    groups.push(...(response.logGroups ?? []).map((group) => group.logGroupName));
    nextToken = response.nextToken;
  } while (nextToken);
  return groups.filter(Boolean);
};

const pollQuery = async (logs, queryId) => {
  for (let attempt = 0; attempt < 90; attempt++) {
    const response = await logs.send(new GetQueryResultsCommand({ queryId }));
    if (response.status === 'Complete') {
      return response.results ?? [];
    }
    if (['Failed', 'Cancelled', 'Timeout'].includes(response.status)) {
      throw new Error(`Logs Insights query ${queryId} ended with status ${response.status}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error(`Logs Insights query ${queryId} did not complete in time`);
};

const queryLogGroup = async (logs, logGroupName, { startTime, endTime, pattern }) => {
  const { queryId } = await logs.send(
    new StartQueryCommand({
      logGroupName,
      startTime,
      endTime,
      queryString: buildQueryString(pattern),
      limit: 1000
    })
  );
  const rows = await pollQuery(logs, queryId);
  return rows.map((row) => {
    const field = (name) => row.find((entry) => entry.field === name)?.value ?? '';
    return { logGroup: logGroupName, timestamp: field('@timestamp'), message: field('@message') };
  });
};

const queryErrors = async ({ region, days, pattern = ERROR_PATTERN }) => {
  const logs = new CloudWatchLogsClient({ region });
  const groups = await listLambdaLogGroups(logs);
  const endTime = Math.floor(Date.now() / 1000);
  const startTime = endTime - days * 24 * 60 * 60;
  const settled = await Promise.allSettled(
    groups.map((name) => queryLogGroup(logs, name, { startTime, endTime, pattern }))
  );
  const errors = [];
  settled.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(`Query failed for ${groups[index]}: ${result.reason}`);
    } else {
      errors.push(...result.value);
    }
  });
  return errors;
};

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

export { ERROR_PATTERN, listAlarmsInAlarm, queryErrors };
