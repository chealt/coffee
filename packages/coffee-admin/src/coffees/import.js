/* eslint-disable no-console, complexity */
import { createClient } from '@libsql/client';

import parsers from './parsers.js';
import roasters from '../../../coffee.chealt.com/data/roasters.json' with { type: 'json' };
import { getContentHash } from '../../../coffee.chealt.com/src/utils/file.js';
import { writeFile } from 'node:fs/promises';

const authToken = process.env.TURSO_DEFAULT_TOKEN;
const databaseUrl = process.env.TURSO_DATABASE_URL;

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

const hasRoaster = process.argv.some((arg) => arg.includes('--roasterId='));
const roasterId =
  hasRoaster && Number(process.argv.find((arg) => arg.includes('--roasterId=')).replace('--roasterId=', ''));

if (!roasterId) {
  throw new Error('Please provide a roasterId as an argument --roasterId=');
}

const roaster = roasters.find(({ id }) => id === roasterId);

if (!roaster) {
  throw new Error(`Roaster with id ${roasterId} not found`);
}

const parser = parsers[roasterId];

if (!parser) {
  throw new Error(`Parser for roaster ${roasterId} does NOT exist`);
}

const coffees = await parser(roaster);

await Promise.all(
  coffees
    .filter(({ originCountryId }) => Boolean(originCountryId)) // origin country ID must be set
    .map(
      async ({
        brewingMethodId,
        currency,
        image,
        isDecaf = false,
        originCountryId,
        originFarmId,
        originRegionId,
        price,
        pricePerGram,
        tasteNoteIds = [],
        webshopItemLink,
        weight
      }) => {
        console.info('Adding coffee to DB...');
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
            :roasterId,
            :webshopItemLink,
            :weight
          ) ON CONFLICT (webshop_item_link) DO UPDATE SET
            brewing_method_id = excluded.brewing_method_id,
            currency = excluded.currency,
            is_decaf = excluded.is_decaf,
            origin_country_id = excluded.origin_country_id,
            origin_farm_id = excluded.origin_farm_id,
            origin_region_id = excluded.origin_region_id,
            price = excluded.price,
            price_per_gram = excluded.price_per_gram,
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
            roasterId,
            webshopItemLink,
            weight
          }
        });

        let coffeeId = results.rows[0]?.id;

        if (coffeeId) {
          console.info(`Inserted Coffee with ID: ${coffeeId}`);
        } else {
          console.info('Coffee already exists, fetching ID...');
          const existingCoffee = await client.execute({
            sql: `SELECT id FROM coffees WHERE webshop_item_link = :webshopItemLink`,
            args: { webshopItemLink }
          });

          coffeeId = existingCoffee.rows[0]?.id;
        }

        if (!coffeeId) {
          throw new Error(`Failed to retrieve coffee ID for: ${webshopItemLink}`);
        }

        if (tasteNoteIds.length) {
          console.info('Adding taste notes to DB...');

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
        }

        if (image) {
          console.info('Fetching coffee image...');
          const imageResponse = await fetch(image);

          if (!imageResponse.ok) {
            throw new Error(`Failed to fetch image ${image}`);
          }

          const arrayBuffer = await imageResponse.arrayBuffer();

          const fileHash = await getContentHash({ arrayBuffer });
          const imageFilename = `${fileHash}.${image.slice(image.lastIndexOf('.') + 1)}`;

          console.info(`Saving coffee image for coffee ID: ${coffeeId}...`);

          try {
            await writeFile(`../coffee.chealt.com/public/coffees/${imageFilename}`, Buffer.from(arrayBuffer), {
              flag: 'wx'
            });
          } catch (error) {
            if (error.code !== 'EEXIST') {
              throw error;
            }
          }

          console.info(`Saving coffee image into the DB for coffee ID: ${coffeeId}...`);
          await client.execute({
            sql: `INSERT OR IGNORE INTO coffee_images (
            coffee_id,
            url
          ) VALUES (
            :coffeeId,
            :imageFilename
          )`,
            args: {
              coffeeId,
              imageFilename
            }
          });
        }
      }
    )
).catch((error) => {
  throw error;
});
