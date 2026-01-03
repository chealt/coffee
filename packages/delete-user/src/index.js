import { createClient } from '@libsql/client';
import { createClient as createPlatformClient } from '@tursodatabase/api';

import { getSecret } from './AWS.js';
import logger from './Sentry/logger.js';
import { deleteSecret } from './cloudflare.js';

export const handler = async (event) => {
  if (!event?.username) {
    logger.error('Username is not set');

    throw new Error('Username is not set');
  }

  if (!event?.email) {
    logger.error('Email is not set');

    throw new Error('Email is not set');
  }

  const username = event.username;
  const email = event.email;

  const secrets = await getSecret({ name: 'deleteUser' });

  process.env.CLOUDFLARE_ACCOUNT_ID = secrets.CLOUDFLARE_ACCOUNT_ID;
  process.env.CLOUDFLARE_API_TOKEN = secrets.CLOUDFLARE_API_TOKEN;

  if (!secrets.CLOUDFLARE_ACCOUNT_ID) {
    logger.error('CLOUDFLARE_ACCOUNT_ID is not set');

    throw new Error('CLOUDFLARE_ACCOUNT_ID is not set');
  }

  if (!secrets.CLOUDFLARE_API_TOKEN) {
    logger.error('CLOUDFLARE_API_TOKEN is not set');

    throw new Error('CLOUDFLARE_API_TOKEN is not set');
  }

  if (!secrets.TURSO_API_TOKEN) {
    logger.error('TURSO_API_TOKEN is not set');

    throw new Error('TURSO_API_TOKEN is not set');
  }

  if (!secrets.TURSO_DEFAULT_TOKEN) {
    logger.error('TURSO_DEFAULT_TOKEN is not set');

    throw new Error('TURSO_DEFAULT_TOKEN is not set');
  }

  process.env.TURSO_API_TOKEN = secrets.TURSO_API_TOKEN;
  process.env.TURSO_DATABASE_URL = secrets.TURSO_DATABASE_URL;
  process.env.TURSO_DEFAULT_TOKEN = secrets.TURSO_DEFAULT_TOKEN;

  const token = process.env.TURSO_API_TOKEN;
  const defaultToken = process.env.TURSO_DEFAULT_TOKEN;
  const defaultDatabaseUrl = process.env.TURSO_DATABASE_URL;

  const client = createClient({
    url: defaultDatabaseUrl,
    authToken: defaultToken
  });

  logger.info(`deleting user '${username}' with email ${email}`);
  await client.execute({
    sql: 'DELETE FROM users WHERE username = :username AND email = :email',
    args: {
      username,
      email
    }
  });

  const platformClient = createPlatformClient({
    org: 'chealt',
    token
  });

  logger.info(`deleting user database '${username}'`);
  await platformClient.databases.delete(username);

  logger.info(`removing Cloudflare secret for '${username}'`);
  await Promise.all([
    deleteSecret({ scriptName: 'coffee', name: `TURSO_AUTH_TOKEN_${username.toUpperCase()}` }),
    deleteSecret({ scriptName: 'coffee', name: `TURSO_DATABASE_URL_${username.toUpperCase()}` })
  ]).catch((error) => {
    logger.error(`Failed to remove Cloudflare secret for '${username}', please remove manually`);

    throw error;
  });
};
