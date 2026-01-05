import { createClient } from '@libsql/client';

import { getSecret } from './AWS.js';
import logger from './Sentry/logger.js';

export const handler = async () => {
  const secrets = await getSecret({ name: 'importCurrencies' });

  const appId = secrets.OPEN_CURRENCY_EXCHANGE_APP_ID;

  if (!appId) {
    logger.error('OPEN_CURRENCY_EXCHANGE_APP_ID is not set');

    throw new Error('OPEN_CURRENCY_EXCHANGE_APP_ID is not set');
  }

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

  logger.info('Fetching latest rates...');
  const response = await fetch('https://openexchangerates.org/api/latest.json', {
    headers: {
      Authorization: `Token ${appId}`
    }
  });

  if (!response.ok) {
    logger.error('Failed to fetch rates', response);

    throw new Error(response);
  }

  const { rates } = await response.json();

  const client = createClient({
    url: databaseUrl,
    authToken
  });

  try {
    logger.info('Adding rates to DB...');
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
    logger.error('Failed to add rates to DB', error);

    throw error;
  }

  logger.info('Added rates to the DB');
};
