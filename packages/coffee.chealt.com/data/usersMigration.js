/* oxlint-disable no-console */
import { createClient } from '@libsql/client';
import { createClient as createPlatformClient } from '@tursodatabase/api';
import { migrate as migrateMultipleAuthChallenges } from './migrations/multiple-auth-challenges.js';

const databaseUrl = process.env.TURSO_DATABASE_URL;
const defaultAuthToken = process.env.TURSO_AUTH_TOKEN;

if (!databaseUrl) {
  throw new Error('TURSO_DATABASE_URL is not set');
}

if (!defaultAuthToken) {
  throw new Error('TURSO_AUTH_TOKEN is not set');
}

const client = createClient({
  url: databaseUrl,
  authToken: defaultAuthToken
});

const token = process.env.TURSO_API_TOKEN;

if (!token) {
  throw new Error('TURSO_API_TOKEN is not set');
}

const platformClient = createPlatformClient({
  org: 'chealt',
  token
});

console.info('Selecting users...');
const { rows: users } = await client.execute({
  sql: 'SELECT username FROM users u'
});

await Promise.all(
  users.map(async ({ username }) => {
    const { hostname } = await platformClient.databases.get(username);

    const url = `libsql://${hostname}`;

    console.info(`creating user DB token for: ${username}`);
    const { jwt: authToken } = await platformClient.databases.createToken(username, {
      authorization: 'full-access'
    });

    const userClient = createClient({
      url,
      authToken
    });

    await migrateMultipleAuthChallenges(userClient);
  })
);
