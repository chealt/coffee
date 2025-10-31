import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { getClient } from './client.js';

const generateUploadUrl = async ({ filename, contentType }) => {
  const client = getClient();

  const command = new PutObjectCommand({
    Bucket: 'centralbeans-coffee-images',
    Key: filename,
    ContentType: contentType
  });

  const url = await getSignedUrl(client, command, {
    expiresIn: 10
  });

  return url;
};

const getSizedImagePath = (size) => {
  switch (size) {
    case 'small':
      return '/600';
    case 'medium':
      return '/1024';
    default:
      return '';
  }
};

const getImageUrl = ({ filename, size } = {}) =>
  `https://collection-images.centralbeans.com${getSizedImagePath(size)}/${filename || ''}.webp`;

export { generateUploadUrl, getImageUrl };
