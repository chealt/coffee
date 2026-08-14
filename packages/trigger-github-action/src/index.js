import { getSecret } from './AWS.js';
import { triggerAction } from './GitHub.js';
import logger from './Sentry/logger.js';

export const handler = async () => {
  const secrets = await getSecret({ name: 'githubActionsContentsReadWrite' });

  if (!secrets.GITHUB_ACCESS_TOKEN) {
    logger.error('GITHUB_ACCESS_TOKEN is not set');

    throw new Error('GITHUB_ACCESS_TOKEN is not set');
  }

  const token = secrets.GITHUB_ACCESS_TOKEN;

  logger.info(`triggering github action`);

  const response = await triggerAction({
    body: { ref: 'main' },
    token,
    owner: 'chealt',
    repo: 'coffee',
    workflow: 'dataExport'
  });

  if (response.ok) {
    return { success: true };
  }

  const errorMessage = await response.text();
  logger.error(`Could not trigger action, status: ${response.status}, message: ${errorMessage}`);

  throw new Error('Could not trigger action');
};
