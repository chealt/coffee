import { createClient } from '@libsql/client';

const clients = {};

const getClient = (username) => {
  if (!username) {
    return createClient({
      url: process.env.TURSO_DATABASE_URL || import.meta.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN || import.meta.env.TURSO_AUTH_TOKEN
    });
  }

  if (clients[username]) {
    return clients[username];
  }

  const url =
    process.env[`TURSO_DATABASE_URL_${username.toUpperCase()}`] ||
    import.meta.env[`TURSO_DATABASE_URL_${username.toUpperCase()}`];
  const authToken =
    process.env[`TURSO_AUTH_TOKEN_${username.toUpperCase()}`] ||
    import.meta.env[`TURSO_AUTH_TOKEN_${username.toUpperCase()}`];

  if (!url) {
    throw new Error(`No database URL found for user ${username}`);
  }

  const client = createClient({ url, authToken });

  clients[username] = client;

  return client;
};

export { getClient };
