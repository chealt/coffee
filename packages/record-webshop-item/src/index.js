import { callWebshopItemProcessor } from './AWS.js';
import logger from './Sentry/logger.js';
import { deflateSync } from 'node:zlib';

const handler = async (event) => {
  const { roasterId, url, isTest } = event;

  if (!roasterId) {
    logger.error(`roasterId is missing from the event`);

    throw new Error(`roasterId is missing from the event`);
  }

  if (!url) {
    logger.error(`url is missing from the event`);

    throw new Error(`url is missing from the event`);
  }

  logger.info(`Recording webshop for ${roasterId}`);

  const cacheBustedUrl = new URL(url);
  cacheBustedUrl.searchParams.set('_cb', Date.now().toString());

  logger.info(`Fetching webshop item page ${cacheBustedUrl}`);
  const response = await fetch(cacheBustedUrl, {
    headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
  });

  if (!response.ok) {
    logger.error(`Failed to fetch webshop item page ${url}`);

    throw new Error(`Failed to fetch webshop item page ${url}`);
  }

  const html = (await response.text()).match(/<body[^>]*>[\s\S]*<\/body>/giu)[0];

  logger.info(`Recording webshop item page for "${url}" and roaster id: ${roasterId}`);

  if (!isTest) {
    await callWebshopItemProcessor({ url, html: deflateSync(html).toString('base64'), roasterId });
  } else {
    logger.info(html);
  }

  return { success: true };
};

export { handler };
