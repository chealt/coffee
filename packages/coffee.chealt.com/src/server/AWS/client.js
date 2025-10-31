import { S3Client } from '@aws-sdk/client-s3';

import { accessKeyId, region, secretAccessKey } from './config.js';

let client;

const getClient = () => {
  if (client) {
    return client;
  }

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('No credentials found');
  }

  client = new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });

  return client;
};

export { getClient };
