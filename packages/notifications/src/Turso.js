import { createClient } from '@libsql/client';
import { createClient as createPlatformClient } from '@tursodatabase/api';

import { getSecret } from './AWS.js';
import logger from './Sentry/logger.js';

const secrets = await getSecret({ name: 'notifications' });

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

const token = secrets.TURSO_API_TOKEN;

if (!token) {
  logger.error('TURSO_API_TOKEN is not set');

  throw new Error('TURSO_API_TOKEN is not set');
}

const platformClient = createPlatformClient({
  org: 'chealt',
  token
});

export { client, platformClient };
