import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { getClient } from './client';

const env = import.meta.env || process.env;

const generateUploadUrl = async ({ username, filename, contentType }) => {
  const client = getClient(username);

  const command = new PutObjectCommand({
    Bucket: `${env.CLOUDFLARE_R2_BUCKET_PREFIX}-${username}`,
    Key: `coffee-images/${filename}`,
    ContentType: contentType
  });

  return await getSignedUrl(client, command, { expiresIn: 3600 });
};

export { generateUploadUrl };
