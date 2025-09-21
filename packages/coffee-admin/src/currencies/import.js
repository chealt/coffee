/* eslint-disable no-console */
import { createClient } from '@libsql/client';

const appId = process.env.OPEN_CURRENCY_EXCHANGE_APP_ID;

if (!appId) {
  throw new Error('OPEN_CURRENCY_EXCHANGE_APP_ID is not set');
}

const authToken = process.env.TURSO_DEFAULT_TOKEN;
const databaseUrl = process.env.TURSO_DATABASE_URL;

if (!databaseUrl) {
  throw new Error('TURSO_DATABASE_URL is not set');
}

if (!authToken) {
  throw new Error('TURSO_DEFAULT_TOKEN is not set');
}

console.info('Fetching latest rates...');
const response = await fetch('https://openexchangerates.org/api/latest.json', {
  headers: {
    Authorization: `Token ${appId}`
  }
});

if (!response.ok) {
  throw new Error(response);
}

const { rates } = await response.json();

const client = createClient({
  url: databaseUrl,
  authToken
});

try {
  console.info('Adding rates to DB...');
  await client.batch(
    Object.keys(rates).map((currencyCode) => ({
      sql: `INSERT INTO exchange_rates (currency_code, rate)
              VALUES (:currencyCode, :rate)
            ON CONFLICT (currency_code) DO UPDATE
              SET rate = :rate`,
      args: { currencyCode, rate: rates[currencyCode] }
    }))
  );
} catch (error) {
  throw error;
}

console.info('Added rates to the DB');
