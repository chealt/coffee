import { AwsClient as AWSClient } from 'aws4fetch';

const env = {
  CLOUDFLARE_R2_ACCESS_KEY_ID_ATTILABARTHA:
    import.meta.env?.CLOUDFLARE_R2_ACCESS_KEY_ID_ATTILABARTHA || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID_ATTILABARTHA,
  CLOUDFLARE_R2_ACCESS_SECRET_ATTILABARTHA:
    import.meta.env?.CLOUDFLARE_R2_ACCESS_SECRET_ATTILABARTHA || process.env.CLOUDFLARE_R2_ACCESS_SECRET_ATTILABARTHA
};

const clients = {};

const getClient = (username) => {
  if (clients[username]) {
    return clients[username];
  }

  const accessKeyId = env[`CLOUDFLARE_R2_ACCESS_KEY_ID_${username.toUpperCase()}`];
  const secretAccessKey = env[`CLOUDFLARE_R2_ACCESS_SECRET_${username.toUpperCase()}`];

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(`No R2 credentials found for ${username}`);
  }

  const client = new AWSClient({
    accessKeyId,
    region: 'auto',
    secretAccessKey,
    service: 's3'
  });

  clients[username] = client;

  return client;
};

export { getClient };
