import { createClient } from '@libsql/client';

import { getSecret } from './AWS.js';
import logger from './Sentry/logger.js';

const secrets = await getSecret({ name: 'recordWebshopItemDetails' });

const authToken = secrets.TURSO_DEFAULT_TOKEN;
const databaseUrl = secrets.TURSO_DATABASE_URL;

if (!databaseUrl) {
  logger.error('TURSO_DATABASE_URL is not set');

  throw new Error('TURSO_DATABASE_URL is not set');
}

if (!authToken) {
  logger.error('TURSO_DEFAULT_TOKEN is not set');

  throw new Error('TURSO_DEFAULT_TOKEN is not set');
}

const client = createClient({
  url: databaseUrl,
  authToken
});

/* eslint-disable complexity */
const storeDetails = async ({
  filename,
  details: {
    brewingMethodId,
    currency,
    isDecaf = false,
    originCountryId,
    originFarmId = null,
    originRegionId = null,
    price,
    pricePerGram,
    processingMethodId = null,
    roasterId,
    tasteNoteIds = [],
    varietyIds = [],
    webshopItemLink,
    weight
  }
}) => {
  if (!originCountryId || (!varietyIds.length && !tasteNoteIds.length) || !price || !weight || !pricePerGram) {
    logger.info(`Missing details, not saving ${filename} to database`);

    return;
  }

  logger.info('Adding coffee to DB');
  const results = await client.execute({
    sql: `INSERT INTO coffees (
      brewing_method_id,
      currency,
      is_decaf,
      origin_country_id,
      origin_farm_id,
      origin_region_id,
      price,
      price_per_gram,
      processing_method_id,
      roaster_id,
      webshop_item_link,
      weight
    ) VALUES (
      :brewingMethodId,
      :currency,
      :isDecaf,
      :originCountryId,
      :originFarmId,
      :originRegionId,
      :price,
      :pricePerGram,
      :processingMethodId,
      :roasterId,
      :webshopItemLink,
      :weight
    ) ON CONFLICT (webshop_item_link) DO UPDATE SET
      brewing_method_id = excluded.brewing_method_id,
      currency = excluded.currency,
      is_decaf = excluded.is_decaf,
      is_removed = false,
      origin_country_id = excluded.origin_country_id,
      origin_farm_id = excluded.origin_farm_id,
      origin_region_id = excluded.origin_region_id,
      price = excluded.price,
      price_per_gram = excluded.price_per_gram,
      processing_method_id = excluded.processing_method_id,
      roaster_id = excluded.roaster_id,
      weight = excluded.weight
    `,
    args: {
      brewingMethodId,
      currency: currency || 'PLN',
      isDecaf,
      originCountryId,
      originFarmId,
      originRegionId,
      price,
      pricePerGram,
      processingMethodId,
      roasterId,
      webshopItemLink,
      weight
    }
  });

  let coffeeId = results.rows[0]?.id;

  if (coffeeId) {
    logger.info(`Inserted Coffee with ID: ${coffeeId}`);
  } else {
    logger.info('Coffee already exists, fetching ID...');
    const existingCoffee = await client.execute({
      sql: `SELECT id FROM coffees WHERE webshop_item_link = :webshopItemLink`,
      args: { webshopItemLink }
    });

    coffeeId = existingCoffee.rows[0]?.id;
  }

  if (!coffeeId) {
    logger.error(`Failed to retrieve coffee ID for: ${webshopItemLink}`);

    throw new Error(`Failed to retrieve coffee ID for: ${webshopItemLink}`);
  }

  if (!tasteNoteIds.length) {
    logger.info(`Removing coffee without taste notes: ${coffeeId}`);

    await client.batch([
      { sql: 'UPDATE coffees SET is_removed = true WHERE id = :coffeeId', args: { coffeeId } },
      {
        sql: 'DELETE FROM coffee_taste_notes WHERE coffee_id = :coffeeId',
        args: { coffeeId }
      },
      {
        sql: 'DELETE FROM coffee_varieties WHERE coffee_id = :coffeeId',
        args: { coffeeId }
      },
      {
        sql: 'DELETE FROM coffee_images WHERE coffee_id = :coffeeId',
        args: { coffeeId }
      }
    ]);

    return;
  }

  logger.info('Clearing taste notes...');
  await client.execute({
    sql: `DELETE FROM coffee_taste_notes WHERE coffee_id = :coffeeId AND taste_note_id NOT IN (${tasteNoteIds.join(',')})`,
    args: { coffeeId }
  });

  logger.info('Adding taste notes to DB...');
  await client.batch(
    tasteNoteIds.map((tasteNoteId) => ({
      sql: `INSERT OR IGNORE INTO coffee_taste_notes (
          coffee_id,
          taste_note_id
        ) VALUES (
          :coffeeId,
          :tasteNoteId
        )`,
      args: {
        coffeeId,
        tasteNoteId
      }
    }))
  );

  if (varietyIds.length) {
    logger.info('Clearing varieties...');
    await client.execute({
      sql: `DELETE FROM coffee_varieties WHERE coffee_id = :coffeeId AND variety_id NOT IN (${varietyIds.join(',')})`,
      args: { coffeeId }
    });

    logger.info('Adding varieties to DB...');
    await client.batch(
      varietyIds.map((varietyId) => ({
        sql: `INSERT OR IGNORE INTO coffee_varieties (
          coffee_id,
          variety_id
        ) VALUES (
          :coffeeId,
          :varietyId
        )`,
        args: {
          coffeeId,
          varietyId
        }
      }))
    );
  }

  logger.info(`Removing unnecessary coffee images from DB for coffee ID: ${coffeeId}`);
  await client.execute({
    sql: 'DELETE FROM coffee_images WHERE coffee_id = :coffeeId AND url != :filename',
    args: {
      coffeeId,
      filename
    }
  });

  logger.info(`Saving coffee image into the DB for coffee ID: ${coffeeId}`);
  await client.execute({
    sql: `INSERT OR IGNORE INTO coffee_images (
      coffee_id,
      url
    ) VALUES (
      :coffeeId,
      :filename
    )`,
    args: {
      coffeeId,
      filename
    }
  });
};

export { storeDetails };
