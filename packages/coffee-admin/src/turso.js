import { createClient } from '@libsql/client';

import { getSecret } from './AWS.js';

const secrets = await getSecret({ name: 'coffeeAdmin' });

const databaseUrl = secrets.TURSO_DATABASE_URL;
const authToken = secrets.TURSO_DEFAULT_TOKEN;

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

export default client;
