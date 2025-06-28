import { createClient } from '@libsql/client';

const env = {
  TURSO_DATABASE_URL_ATTILABARTHA:
    import.meta.env.TURSO_DATABASE_URL_ATTILABARTHA || process.env.TURSO_DATABASE_URL_ATTILABARTHA,
  TURSO_AUTH_TOKEN_ATTILABARTHA:
    import.meta.env.TURSO_AUTH_TOKEN_ATTILABARTHA || process.env.TURSO_AUTH_TOKEN_ATTILABARTHA
};

const clients = {};

const getClient = (username) => {
  if (clients[username]) {
    return clients[username];
  }

  const url = env[`TURSO_DATABASE_URL_${username.toUpperCase()}`];
  const authToken = env[`TURSO_AUTH_TOKEN_${username.toUpperCase()}`];

  try {
    const client = createClient({ url, authToken });

    clients[username] = client;

    return client;
  } catch (error) {
    throw error;
  }
};

export { getClient };
