import { JSDOM } from 'jsdom';
import { Agent } from 'undici';

import logger from './Sentry/logger.js';
import client from './Turso.js';

// eslint-disable-next-line complexity
const isOutOfStock = ({ html, roasterId, webshopItemLink }) => {
  if (
    roasterId !== 6 &&
    roasterId !== 7 &&
    roasterId !== 39 &&
    roasterId !== 65 &&
    roasterId !== 252 &&
    roasterId !== 277 &&
    roasterId !== 288
  ) {
    return false;
  }

  if (roasterId === 7) {
    return html.includes('Obecnie brak na stanie');
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

export const handler = async ({ id, webshopItemLink, roasterId }) => {
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
  } catch {
    logger.error(`Fetch failed for ${webshopItemLink}`);

    return;
  }

  // Sheep and Raven uses 301 for no longer available coffees
  if (
    response.status === 404 ||
    response.status === 301 ||
    isOutOfStock({ html: await response.text(), roasterId, webshopItemLink })
  ) {
    logger.info(`Flagging coffee with id ${id} as removed...`);

    await client.execute({
      sql: 'UPDATE coffees SET is_removed = true WHERE id = :id',
      args: { id }
    });

    logger.info(`Coffee with id ${id} is flagged as removed.`);
  }
};
