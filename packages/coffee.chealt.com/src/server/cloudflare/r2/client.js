import { AwsClient as AWSClient } from 'aws4fetch';

let client;

const getClient = () => {
  if (client) {
    return client;
  }

  const accessKeyId = import.meta.env?.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = import.meta.env?.CLOUDFLARE_R2_ACCESS_SECRET || process.env.CLOUDFLARE_R2_ACCESS_SECRET;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('No R2 credentials found');
  }

  client = new AWSClient({
    accessKeyId,
    region: 'auto',
    secretAccessKey,
    service: 's3'
  });

  return client;
};

export { getClient };
