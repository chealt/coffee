import { getSecret } from './AWS.js';
import { groupFailures } from './failures.js';
import { triggerAction } from './GitHub.js';
import logger from './Sentry/logger.js';

const OWNER = 'chealt';
const REPO = 'coffee';

const dispatchErrorFix = async ({ records, token }) => {
  for (const { taskId, context } of groupFailures(records)) {
    logger.info(`dispatching error fix for ${taskId}, ${context.occurrences} failures`);

    const response = await triggerAction({
      body: { ref: 'main', inputs: { taskId, errorContext: JSON.stringify(context) } },
      token,
      owner: OWNER,
      repo: REPO,
      workflow: 'errorFix'
    });

    if (!response.ok) {
      const errorMessage = await response.text();
      logger.error(`Could not dispatch ${taskId}, status: ${response.status}, message: ${errorMessage}`);

      throw new Error('Could not dispatch error fix');
    }
  }
};

export const handler = async (event) => {
  const secrets = await getSecret({ name: 'githubActionsContentsReadWrite' });

  if (!secrets.GITHUB_ACCESS_TOKEN) {
    logger.error('GITHUB_ACCESS_TOKEN is not set');

    throw new Error('GITHUB_ACCESS_TOKEN is not set');
  }

  const token = secrets.GITHUB_ACCESS_TOKEN;

  if (event?.Records) {
    await dispatchErrorFix({ records: event.Records, token });

    return { success: true };
  }

  logger.info(`triggering github action`);

  const response = await triggerAction({
    body: { ref: 'main' },
    token,
    owner: OWNER,
    repo: REPO,
    workflow: 'dataExport'
  });

  if (response.ok) {
    return { success: true };
  }

  const errorMessage = await response.text();
  logger.error(`Could not trigger action, status: ${response.status}, message: ${errorMessage}`);

  throw new Error('Could not trigger action');
};
