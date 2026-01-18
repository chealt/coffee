import { convertImage } from './AWS/image.js';
import { extractText } from './AWS/text.js';
import logger from './Sentry/logger.js';

const handler = async (event) => {
  const { key: filename } = event.Records[0].s3.object;

  if (!filename) {
    logger.error('No filename');

    throw new Error('No filename');
  }

  logger.info(`Processing ${filename}`);
  await Promise.all([convertImage({ filename }), extractText({ filename })]);
  logger.info(`Processed ${filename}`);

  return { success: true };
};

export { handler };
