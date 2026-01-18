import { GetObjectCommand, NoSuchKey, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import sharp from 'sharp';

import logger from './Sentry/logger.js';
import { getContentHash } from './utils.js';

const imageBucketName = 'centralbeans-images-public';
const contentType = 'image/webp';
const cacheControl = 'public, max-age=31556952, immutable';
const imageExtension = 'webp';

const client = new S3Client({
  region: 'eu-central-1'
});

const getSecret = async ({ name }) => {
  const secretsClient = new SecretsManagerClient({
    region: 'eu-central-1'
  });

  const response = await secretsClient.send(
    new GetSecretValueCommand({
      SecretId: name
    })
  );

  return JSON.parse(response.SecretString);
};

const putObject = async ({ bucketName, key, data }) =>
  client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
      Body: data,
      CacheControl: cacheControl
    })
  );

const getObject = async ({ bucketName, key }) =>
  client.send(
    new GetObjectCommand({
      Bucket: bucketName,
      Key: key
    })
  );

const storeImage = async ({ url }) => {
  logger.info(`Storing image ${url}`);

  logger.info(`Fetching image ${url}`);
  const imageResponse = await fetch(url);

  if (!imageResponse.ok) {
    logger.error(`Failed to fetch image ${url}`);

    throw new Error(`Failed to fetch image ${url}`);
  }

  const arrayBuffer = await imageResponse.arrayBuffer();

  const fileHash = await getContentHash({ arrayBuffer });
  const filename = `${fileHash}.${imageExtension}`;

  logger.info(`Checking if image ${fileHash} already exists`);
  let existingFileResponse;

  try {
    existingFileResponse = await getObject({
      bucketName: imageBucketName,
      key: filename
    });
  } catch (error) {
    if (error instanceof NoSuchKey) {
      logger.info(`Image ${fileHash} does not exist, continuing`);
    } else {
      throw error;
    }
  }

  if (existingFileResponse?.Body) {
    logger.info(`Image ${fileHash} already exists, skipping conversion`);

    return filename;
  }

  logger.info(`Converting image ${url}`);
  const convertedImage = await sharp(arrayBuffer).webp({
    lossless: false,
    quality: 85
  });

  logger.info(`Getting image buffer for ${url}`);
  const data = await convertedImage.toBuffer();

  logger.info(`Saving image ${fileHash}`);
  await putObject({
    bucketName: imageBucketName,
    key: filename,
    data
  });

  logger.info(`Resizing image ${fileHash}`);
  const smallImageData = await convertedImage.resize({ width: 600 }).toBuffer();
  const mediumImageData = await convertedImage.resize({ width: 1024 }).toBuffer();

  logger.info(`Saving resized images ${fileHash}`);
  await Promise.all([
    putObject({
      bucketName: imageBucketName,
      key: `600/${filename}`,
      data: smallImageData
    }),
    putObject({
      bucketName: imageBucketName,
      key: `1024/${filename}`,
      data: mediumImageData
    })
  ]);

  return `${filename}`;
};

export { getSecret, storeImage };
