import { createClient } from '@libsql/client';

const databaseUrl = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_DEFAULT_TOKEN;

if (!databaseUrl) {
  console.error('TURSO_DATABASE_URL is not set');

  throw new Error('TURSO_DATABASE_URL is not set');
}

if (!authToken) {
  console.error('TURSO_DEFAULT_TOKEN is not set');

  throw new Error('TURSO_DEFAULT_TOKEN is not set');
}

const client = createClient({
  url: databaseUrl,
  authToken
});

export default client;
