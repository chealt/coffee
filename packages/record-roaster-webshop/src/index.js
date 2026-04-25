import { invokeLambda } from './AWS.js';
import logger from './Sentry/logger.js';
// eslint-disable-next-line import/no-unresolved
import roasters from '../data/roasters.json' with { type: 'json' };
import { deflateSync } from 'node:zlib';

export const handler = async ({ isTest, roasterId }) => {
  logger.info(`Recording webshop for ${roasterId}`);

  const roaster = roasters.find(({ id }) => id === roasterId);

  if (!roaster) {
    throw new Error(`Roaster: "${roasterId}" not found`);
  }

  const url = roaster.webshop;

  if (!url) {
    throw new Error(`Roaster: "${roasterId}" has no webshop`);
  }

  logger.info(`Fetching webshop page ${url}`);

  const response = await fetch(url, {
    headers: {
      Cookie: 'selectedRegion=eu' // La Cabra
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch webshop page ${url}`);
  }

  const html = (await response.text()).match(/<body[^>]*>[\s\S]*<\/body>/giu)[0];

  logger.info(`Invoke webshop processor for ${roasterId} and url: ${url}`);

  if (isTest) {
    logger.info({ html });
  } else {
    await invokeLambda({
      functionName: 'webshopProcessor',
      payload: { url, roasterId, html: deflateSync(html).toString('base64') }
    });
  }
};
