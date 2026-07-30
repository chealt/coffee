import { fetch, Agent } from 'undici';
import config from './config.json' with { type: 'json' };

import logger from './Sentry/logger.js';
import client from './Turso.js';

// eslint-disable-next-line complexity
const isOutOfStock = ({ html, roasterId, webshopItemLink }) => {
  const roasterConfig = config.find((c) => c.roasterId === roasterId);

  if (!roasterConfig) {
    logger.info(`Skipping item ${webshopItemLink} because roaster has no sold out text config`);

    return false;
  }

  const lowerCaseHTML = html.toLowerCase();

  return (
    roasterConfig.soldOutTexts.some((text) => lowerCaseHTML.includes(text)) &&
    (!roasterConfig.inStockTexts || roasterConfig.inStockTexts.every((text) => !lowerCaseHTML.includes(text)))
  );
};

// eslint-disable-next-line complexity
export const handler = async ({ id, webshopItemLink, roasterId, isTest }) => {
  if (!id) {
    logger.error('No id provided');

    throw new Error('No id provided');
  }

  if (!webshopItemLink) {
    logger.error(`No webshop item link for coffee with id ${id}`);

    throw new Error('No webshop item link provided');
  }

  if (!roasterId) {
    logger.error(`No roaster id for coffee with id ${id}`);

    throw new Error('No roaster id provided');
  }

  logger.info(`Checking coffee: ${webshopItemLink}`);

  let response;

  try {
    response = await fetch(webshopItemLink, {
      redirect: 'manual',
      dispatcher: new Agent({
        connectTimeout: 10 * 1000 * 1000 // 10 seconds
      })
    });
  } catch (error) {
    logger.error(error);
    logger.error(`Fetch failed for ${webshopItemLink} with error: ${error.message}`);

    return;
  }

  if (
    response.status === 404 ||
    response.status === 302 ||
    response.status === 301 ||
    isOutOfStock({ html: await response.text(), roasterId, webshopItemLink })
  ) {
    logger.info(`Flagging coffee with id ${id} and url ${webshopItemLink} as removed...`);

    if (!isTest) {
      await client.execute({
        sql: 'UPDATE coffees SET is_removed = true, removal_date = :removalDate WHERE id = :id',
        args: { id, removalDate: new Date().toISOString() }
      });
    }

    logger.info(`Coffee with id ${id} is flagged as removed.`);
  }
};
