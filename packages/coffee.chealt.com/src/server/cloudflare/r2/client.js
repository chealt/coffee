import { S3Client } from '@aws-sdk/client-s3';

const env = import.meta.env || process.env;

const clients = {};

const getClient = (username) => {
  if (clients[username]) {
    return clients[username];
  }

  const accessKeyId = env[`CLOUDFLARE_R2_ACCESS_KEY_ID_${username.toUpperCase()}`];
  const secretAccessKey = env[`CLOUDFLARE_R2_SECRET_ACCESS_SECRET_${username.toUpperCase()}`];

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(`No R2 credentials found for ${username}`);
  }

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${username}.${env.CLOUDFLARE_R2_STORAGE_ENDPOINT}`,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });

  clients[username] = client;

  return client;
};

export { getClient };
