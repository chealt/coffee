import { storeImage } from './AWS.js';
import logger from './Sentry/logger.js';
import { storeDetails } from './database.js';

const responses = {
  error: { success: false },
  success: { success: true },
  missingData: { success: false, missingData: true }
};

const handler = async (event) => {
  const { url, details } = event;

  logger.info(`Recording webshop item ${url} with details ${JSON.stringify(details)}`);

  if (!url) {
    logger.info(`Missing url in ${JSON.stringify(event)}`);

    return responses.missingData;
  }

  if (!details) {
    logger.info(`Missing details in ${JSON.stringify(event)}`);

    return responses.missingData;
  }

  if (!details.image) {
    logger.info(`Missing image in ${JSON.stringify(event)}`);

    return responses.missingData;
  }

  let filename;
  try {
    filename = await storeImage({ url: details.image });
  } catch (error) {
    logger.error(`Error storing image for ${url}: ${error}`);

    return responses.error;
  }

  if (filename) {
    try {
      await storeDetails({ filename, details });
    } catch (error) {
      logger.error(`Error storing details for ${url}: ${error}`);

      return responses.error;
    }
  }

  return responses.success;
};

export { handler };
