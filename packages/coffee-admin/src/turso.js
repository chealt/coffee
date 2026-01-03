import { createClient } from '@libsql/client';

import { getSecret } from './AWS.js';
import logger from './Sentry/logger.js';

const secrets = await getSecret({ name: 'coffeeAdmin' });

const databaseUrl = secrets.TURSO_DATABASE_URL;
const authToken = secrets.TURSO_DEFAULT_TOKEN;

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

export default client;
