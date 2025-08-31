import { createClient } from '@libsql/client';

const clients = {};

const getClient = (username) => {
  if (clients[username]) {
    return clients[username];
  }

  const url =
    process.env[`TURSO_DATABASE_URL_${username.toUpperCase()}`] ||
    import.meta.env[`TURSO_DATABASE_URL_${username.toUpperCase()}`];
  const authToken =
    process.env[`TURSO_AUTH_TOKEN_${username.toUpperCase()}`] ||
    import.meta.env[`TURSO_AUTH_TOKEN_${username.toUpperCase()}`];

  try {
    const client = createClient({ url, authToken });

    clients[username] = client;

    return client;
  } catch (error) {
    throw error;
  }
};

export { getClient };
