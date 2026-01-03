import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

import logger from './Sentry/logger.js';

const addSecret = async ({ scriptName, name, text }) => {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  logger.info(`Adding secret "${name}" to worker "${scriptName}"...`);

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${scriptName}/secrets`;

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        text,
        type: 'secret_text'
      })
    });

    if (!response.ok) {
      logger.error(`Could not fetch Cloudflare secrets for script "${scriptName}", status: ${response.status}`);

      throw new Error(response.statusText);
    }

    logger.info('✅ Success! Secret added.', response.data);
  } catch (error) {
    logger.error(error);

    throw new Error(error);
  }
};

const getClient = () =>
  new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.CLOUDFLARE_R2_ACCESS_SECRET
    }
  });

const getObject = async (filename) => {
  const client = getClient();

  const response = await client.send(
    new GetObjectCommand({
      Bucket: 'coffee-images',
      Key: `collection-images/${filename}`
    })
  );

  return {
    ContentType: response.ContentType,
    Body: await response.Body.transformToByteArray()
  };
};

export { addSecret, getObject };
