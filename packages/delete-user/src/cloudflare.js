import logger from './Sentry/logger.js';

const deleteSecret = async ({ scriptName, name }) => {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  logger.info(`Deleting secret "${name}" from worker "${scriptName}"...`);

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${scriptName}/secrets/${name}`;

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${apiToken}`
      }
    });

    if (!response.ok) {
      logger.error(`Could not fetch Cloudflare secrets for script "${scriptName}", status: ${response.status}`);

      throw new Error(response.statusText);
    }

    logger.info('✅ Success! Secret deleted.', response.data);
  } catch (error) {
    logger.error(error);

    throw new Error(error);
  }
};

export { deleteSecret };
