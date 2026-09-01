/* oxlint-disable no-console */
import { createClient } from '@libsql/client';

// The UI tests share a single account and every run leaves the passkeys it registered
// behind. Local, preview and prod runs all authenticate that account against the same
// test database, so clearing it here covers every environment at once.
const username = 'test';

const databaseUrl = process.env.TURSO_DATABASE_URL_TEST;
const authToken = process.env.TURSO_AUTH_TOKEN_TEST;

if (!databaseUrl) {
  throw new Error('TURSO_DATABASE_URL_TEST is not set');
}

if (!authToken) {
  throw new Error('TURSO_AUTH_TOKEN_TEST is not set');
}

const client = createClient({ url: databaseUrl, authToken });

const { rows } = await client.execute({
  sql: 'SELECT id FROM users WHERE name = (:username)',
  args: { username }
});

const user = rows[0];

// A missing user means the credentials point at the wrong database, which would otherwise
// look like a run that simply had nothing to delete
if (!user) {
  throw new Error(`No user named "${username}" in the test database.`);
}

const { rowsAffected } = await client.execute({
  sql: 'DELETE FROM passkeys WHERE user_id = (:user_id)',
  args: { user_id: user.id }
});

console.log(`Deleted ${rowsAffected} passkey(s) left behind by the UI tests.`);
