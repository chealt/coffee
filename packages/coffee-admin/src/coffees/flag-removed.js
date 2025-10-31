/* eslint-disable camelcase */
import { createClient } from '@libsql/client';
import { JSDOM } from 'jsdom';
import { Agent } from 'undici';

const isOutOfStock = ({ html, roaster_id, webshop_item_link }) => {
  // only handle BeMyBean, Father's, and Meron roaster
  if (roaster_id !== 39 && roaster_id !== 277 && roaster_id !== 252) {
    return false;
  }

  if (roaster_id === 252) {
    return html.includes('Sold out');
  }

  if (roaster_id === 277) {
    return html.includes('This product is currently out of stock and unavailable.');
  }

  const {
    window: { document }
  } = new JSDOM(html);

  if (!document.querySelector('.variations_form')) {
    return false;
  }

  const someInStock = JSON.parse(document.querySelector('.variations_form').dataset.product_variations)
    .map((product) => product.is_in_stock)
    .some(Boolean);

  if (!someInStock) {
    console.info(`Item at ${webshop_item_link} is out of stock`);
  }

  return !someInStock;
};

const databaseUrl = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_DEFAULT_TOKEN;

if (!databaseUrl) {
  throw new Error('TURSO_DATABASE_URL is not set');
}

if (!authToken) {
  throw new Error('TURSO_DEFAULT_TOKEN is not set');
}

const client = createClient({
  url: databaseUrl,
  authToken
});

const results = await client.execute({
  sql: 'SELECT id, webshop_item_link, roaster_id FROM coffees WHERE NOT is_removed AND webshop_item_link IS NOT NULL'
});

await Promise.all(
  results.rows.map(async ({ id, webshop_item_link, roaster_id }) => {
    console.info(`Checking coffee: ${webshop_item_link}`);

    let response;

    try {
      response = await fetch(webshop_item_link, {
        dispatcher: new Agent({
          connectTimeout: 60 * 1000 // 1 minute
        })
      });
    } catch {
      console.error(`Fetch failed for ${webshop_item_link}`);

      return;
    }

    // Sheep and Raven uses 301 for no longer available coffees
    if (
      response.status === 404 ||
      response.status === 301 ||
      isOutOfStock({ html: await response.text(), roaster_id, webshop_item_link })
    ) {
      console.info(`Flagging coffee with id ${id} as removed...`);

      await client.execute({
        sql: 'UPDATE coffees SET is_removed = true WHERE id = :id',
        args: { id }
      });

      console.info(`Coffee with id ${id} is flagged as removed.`);
    }
  })
).catch((error) => {
  throw error;
});
