import { callRecordWebshopItem } from './AWS.js';
import logger from './Sentry/logger.js';
import parsers from './parsers.js';
import { inflateSync } from 'node:zlib';

const handler = async (event) => {
  const { roasterId, url } = event;
  const html = inflateSync(Buffer.from(event.html, 'base64')).toString();

  logger.info(`Processing ${url}`);

  if (!url) {
    logger.error('No url');

    throw new Error('No url');
  }

  if (!roasterId) {
    logger.error('No roaster id');

    throw new Error('No roaster id');
  }

  if (!html) {
    logger.error('No HTML');

    throw new Error('No HTML');
  }

  const parser = parsers[roasterId];

  if (!parser) {
    logger.error(`No parser found for ${roasterId}`);

    throw new Error(`No parser found for ${roasterId}`);
  }

  const productLinks = await parser({ html, url });
  logger.info(`Found ${productLinks.length} products at ${url}`);

  // call lambda serially so we don't run into rate limits
  for (const productUrl of productLinks) {
    if (!event.isTest) {
      logger.info(`Invoking record lambda for ${productUrl}`);
      await callRecordWebshopItem({ url: productUrl, roasterId });
    } else {
      logger.info(productUrl);
    }
  }

  if (event.isTest) {
    return productLinks;
  }

  return { success: true };
};

export { handler };
