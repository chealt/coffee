import { callRecordWebshopItemDetails } from './AWS.js';
import logger from './Sentry/logger.js';
import parsers from './parsers.js';
import { inflateSync } from 'node:zlib';

const responses = {
  success: { success: true },
  missingDetails: { success: true, missingDetails: true },
  outOfStock: { success: true, outOfStock: true }
};

// eslint-disable-next-line complexity
const handler = async (event) => {
  const { url, roasterId } = event;
  const html = inflateSync(Buffer.from(event.html, 'base64')).toString();

  logger.info(`Processing ${url}`);

  if (!roasterId) {
    logger.error(`No roaster id found for ${url}, got event ${JSON.stringify(event)}`);

    throw new Error(`No roaster id found for ${url}, got event ${JSON.stringify(event)}`);
  }

  if (!html) {
    logger.error(`No webshop HTML found for ${url}`);

    throw new Error(`No webshop HTML found for ${url}`);
  }

  const parser = parsers[roasterId];

  if (!parser) {
    logger.error(`No parser found for ${roasterId}`);

    throw new Error(`No parser found for ${roasterId}`);
  }

  const details = await parser({ html, url, roasterId });

  if (details.isOutOfStock) {
    logger.info(`Skipping out of stock item ${url}`);

    return responses.success;
  }

  if (details.isBlend) {
    logger.info(`Skipping blend ${url}`);

    return responses.success;
  }

  if (details.isGiftSet) {
    logger.info(`Skipping gift set ${url}`);

    return responses.success;
  }

  if (!details.originCountryId) {
    logger.info(`No origin country found for ${url}, got details: ${JSON.stringify(details)}`);

    return responses.missingDetails;
  }

  if (!details.image) {
    logger.info(`No image found for ${url}, got details: ${JSON.stringify(details)}`);

    return responses.missingDetails;
  }

  if (!details.varietyIds?.length && !details.tasteNoteIds?.length) {
    logger.info(
      `No varieties or taste notes found for ${url}, got details: ${JSON.stringify(details)}, skipping storing`
    );

    return responses.missingDetails;
  }

  if (details.isOutOfStock) {
    logger.info(`Skipping out of stock item ${url}`);

    return responses.outOfStock;
  }

  if (event.isTest) {
    logger.info(details);
  } else {
    logger.info(`Calling record webshop item details for ${url}`);
    await callRecordWebshopItemDetails({ url, details });
  }

  return responses.success;
};

export { handler };
