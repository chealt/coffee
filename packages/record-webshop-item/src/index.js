import { callWebshopItemProcessor } from './AWS.js';
import logger from './Sentry/logger.js';
import { deflateSync } from 'node:zlib';

const handler = async (event) => {
  const { roasterId, url } = event;

  if (!roasterId) {
    logger.error(`roasterId is missing from the event`);

    throw new Error(`roasterId is missing from the event`);
  }

  if (!url) {
    logger.error(`url is missing from the event`);

    throw new Error(`url is missing from the event`);
  }

  logger.info(`Recording webshop for ${roasterId}`);

  logger.info(`Fetching webshop item page ${url}`);

  const cacheBustedUrl = new URL(url);
  cacheBustedUrl.searchParams.set('_cb', Date.now().toString());

  const response = await fetch(cacheBustedUrl, {
    headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
  });

  if (!response.ok) {
    logger.error(`Failed to fetch webshop item page ${url}`);

    throw new Error(`Failed to fetch webshop item page ${url}`);
  }

  const html = (await response.text()).match(/<body[^>]*>[\s\S]*<\/body>/giu)[0];

  logger.info(`Recording webshop item page for "${url}" and roaster id: ${roasterId}`);

  await callWebshopItemProcessor({ url, html: deflateSync(html).toString('base64'), roasterId });

  return { success: true };
};

export { handler };
