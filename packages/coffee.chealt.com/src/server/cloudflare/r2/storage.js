import { getClient } from './client.js';

const env = {
  CLOUDFLARE_R2_BUCKET_DOMAIN: import.meta.env?.CLOUDFLARE_R2_BUCKET_DOMAIN || process.env.CLOUDFLARE_R2_BUCKET_DOMAIN,
  CLOUDFLARE_R2_COLLECTION_FOLDER:
    import.meta.env?.CLOUDFLARE_R2_COLLECTION_FOLDER || process.env.CLOUDFLARE_R2_COLLECTION_FOLDER,
  CLOUDFLARE_R2_STORAGE_ENDPOINT:
    import.meta.env?.CLOUDFLARE_R2_STORAGE_ENDPOINT || process.env.CLOUDFLARE_R2_STORAGE_ENDPOINT
};

const generateUploadUrl = async ({ filename, contentType, method }) => {
  const client = getClient();

  const result = await client.sign(
    new Request(
      `https://${env.CLOUDFLARE_R2_STORAGE_ENDPOINT}/coffee-images/${env.CLOUDFLARE_R2_COLLECTION_FOLDER}/${filename}`,
      {
        method: method || 'PUT',
        headers: { 'Content-Type': contentType }
      }
    ),
    {
      aws: { signQuery: true }, // Important for presigned URLs
      expiresIn: 60 * 10 // 10 minutes
    }
  );

  return result.url.toString();
};

const getSizedImagePath = (size) => {
  switch (size) {
    case 'small':
      return '/cdn-cgi/image/width=600,quality=50';
    case 'medium':
      return '/cdn-cgi/image/width=1024,quality=50';
    default:
      return '';
  }
};

const getImageUrl = ({ filename, size } = {}) =>
  `https://${env.CLOUDFLARE_R2_BUCKET_DOMAIN}${getSizedImagePath(size)}/${env.CLOUDFLARE_R2_COLLECTION_FOLDER}/${filename || ''}`;

export { generateUploadUrl, getImageUrl };
