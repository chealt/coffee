/* eslint-disable camelcase, no-console */
import { createClient } from '@libsql/client';

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

const results = await client.execute({
  sql: 'SELECT id, webshop_item_link FROM coffees WHERE NOT is_removed AND webshop_item_link IS NOT NULL'
});

await Promise.all(
  results.rows.map(async ({ id, webshop_item_link }) => {
    const response = await fetch(webshop_item_link);

    // Sheep and Raven uses 301 for no longer available coffees
    if (response.status === 404 || response.status === 301) {
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
