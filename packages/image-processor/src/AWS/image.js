import sharp from 'sharp';

import { getObject, putObject } from './s3.js';
import logger from '../Sentry/logger.js';

const contentType = 'image/webp';
const cacheControl = 'public, max-age=31556952, immutable';

const convertImage = async ({ filename }) => {
  logger.info(`Fetching image ${filename}`);
  const image = await getObject({ bucketName: 'centralbeans-coffee-images', key: filename });

  logger.info(`Converting image ${filename}`);
  const convertedImage = await sharp(image).webp({
    lossless: false,
    quality: 85
  });

  logger.info(`Getting image buffer for ${filename}`);
  const data = await convertedImage.toBuffer();

  logger.info(`Saving image ${filename}`);
  await putObject({
    bucketName: 'centralbeans-coffee-images-public',
    key: `${filename}.webp`,
    data,
    contentType,
    cacheControl
  });

  logger.info(`Resizing image ${filename}`);
  const smallImageData = await convertedImage.resize({ width: 600 }).toBuffer();
  const mediumImageData = await convertedImage.resize({ width: 1024 }).toBuffer();

  logger.info(`Saving resized images ${filename}`);

  await Promise.all([
    putObject({
      bucketName: 'centralbeans-coffee-images-public',
      key: `600/${filename}.webp`,
      data: smallImageData,
      contentType,
      cacheControl
    }),
    putObject({
      bucketName: 'centralbeans-coffee-images-public',
      key: `1024/${filename}.webp`,
      data: mediumImageData,
      contentType,
      cacheControl
    })
  ]);
};

export { convertImage };
