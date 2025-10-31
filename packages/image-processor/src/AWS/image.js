import sharp from 'sharp';

import { getObject, putObject } from './s3.js';

const contentType = 'image/webp';

const convertImage = async ({ filename }) => {
  console.info(`Fetching image ${filename}`);
  const image = await getObject({ bucketName: 'centralbeans-coffee-images', key: filename });

  console.info(`Converting image ${filename}`);
  const convertedImage = await sharp(image).webp({
    lossless: false,
    quality: 85
  });

  console.info(`Getting image buffer for ${filename}`);
  const data = await convertedImage.toBuffer();

  console.info(`Saving image ${filename}`);
  await putObject({
    bucketName: 'centralbeans-coffee-images-public',
    key: `${filename}.webp`,
    data,
    contentType
  });

  console.info(`Resizing image ${filename}`);
  const smallImageData = await convertedImage.resize({ width: 600 }).toBuffer();
  const mediumImageData = await convertedImage.resize({ width: 1024 }).toBuffer();

  console.info(`Saving resized images ${filename}`);

  await Promise.all([
    putObject({
      bucketName: 'centralbeans-coffee-images-public',
      key: `600/${filename}.webp`,
      data: smallImageData,
      contentType
    }),
    putObject({
      bucketName: 'centralbeans-coffee-images-public',
      key: `1024/${filename}.webp`,
      data: mediumImageData,
      contentType
    })
  ]);
};

export { convertImage };
