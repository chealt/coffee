import { JSDOM } from 'jsdom';
import { fetch, Agent } from 'undici';
import roasters from '../data/roasters.json' with { type: 'json' };

import logger from './Sentry/logger.js';
import client from './Turso.js';

const roasterIDsWithFlaggingLogic = roasters
  .filter(({ has_flag_removed_logic }) => Boolean(has_flag_removed_logic))
  .map(({ id }) => id);

// eslint-disable-next-line complexity
const isOutOfStock = ({ html, roasterId, webshopItemLink }) => {
  if (!roasterIDsWithFlaggingLogic.includes(roasterId)) {
    logger.info(`Skipping item ${webshopItemLink}`);

    return false;
  }

  if (roasterId === 7) {
    return html.includes('Obecnie brak na stanie');
  }

  if (roasterId === 10) {
    return html.toLowerCase().includes('>out of season<');
  }

  if (roasterId === 12) {
    return html.includes('Product is archived');
  }

  if (roasterId === 65) {
    return html.includes('X-Files') || html.includes('Out of stock');
  }

  if (roasterId === 252) {
    return html.includes('Sold out');
  }

  if (roasterId === 277) {
    return html.includes('This product is currently out of stock and unavailable.');
  }

  if (roasterId === 288) {
    return html.includes('This product is out of stock for the foreseeable future.');
  }

  const {
    window: { document }
  } = new JSDOM(html);

  if (roasterId === 6) {
    return !document.querySelector('.swatch_label')?.dataset?.value;
  }

  if (!document.querySelector('.variations_form')) {
    return false;
  }

  const someInStock = JSON.parse(document.querySelector('.variations_form').dataset.product_variations)
    .map((product) => product.is_in_stock)
    .some(Boolean);

  if (!someInStock) {
    logger.info(`Item at ${webshopItemLink} is out of stock`);
  }

  return !someInStock;
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
    response.status === 301 || // Sheep and Raven uses 301 for no longer available coffees
    (roasterId === 82 && response.redirected && response.url === 'https://shop.spojkaroastery.com/') || // Spojka uses redirects for no longer available coffees
    isOutOfStock({ html: await response.text(), roasterId, webshopItemLink })
  ) {
    logger.info(`Flagging coffee with id ${id} and url ${webshopItemLink} as removed...`);

    if (!isTest) {
      await client.execute({
        sql: 'UPDATE coffees SET is_removed = true WHERE id = :id',
        args: { id }
      });
    }

    logger.info(`Coffee with id ${id} is flagged as removed.`);
  }
};
