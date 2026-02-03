import { createClient } from '@libsql/client';
import { createClient as createPlatformClient } from '@tursodatabase/api';
import jwt from 'jsonwebtoken';

import { getSecret, sendEmail } from './AWS.js';
import logger from './Sentry/logger.js';
import { addSecret } from './cloudflare.js';
import content from './email-content.js';
import locales from './locales.js';

// eslint-disable-next-line complexity
export const handler = async (event) => {
  const locale = event?.locale || 'en';

  if (!event?.username) {
    logger.error('Username is not set');

    throw new Error('Username is not set');
  }

  if (!event?.email) {
    logger.error('Email is not set');

    throw new Error('Email is not set');
  }

  if (!event?.locale) {
    logger.info('Locale is not set, defaulting to en');
  }

  const username = event.username;
  const email = event.email;

  const secrets = await getSecret({ name: 'createUser' });

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

  if (!secrets.AWS_REGION) {
    logger.error('AWS_REGION is not set');

    throw new Error('AWS_REGION is not set');
  }

  if (!secrets.TURSO_API_TOKEN) {
    logger.error('TURSO_API_TOKEN is not set');

    throw new Error('TURSO_API_TOKEN is not set');
  }

  if (!secrets.TURSO_DEFAULT_TOKEN) {
    logger.error('TURSO_DEFAULT_TOKEN is not set');

    throw new Error('TURSO_DEFAULT_TOKEN is not set');
  }

  if (!secrets.SESSION_SECRET) {
    logger.error('SESSION_SECRET is not set');

    throw new Error('SESSION_SECRET is not set');
  }

  process.env.AWS_REGION = secrets.AWS_REGION;
  process.env.SESSION_SECRET = secrets.SESSION_SECRET;
  process.env.TURSO_API_TOKEN = secrets.TURSO_API_TOKEN;
  process.env.TURSO_DATABASE_URL = secrets.TURSO_DATABASE_URL;
  process.env.TURSO_DEFAULT_TOKEN = secrets.TURSO_DEFAULT_TOKEN;

  const token = process.env.TURSO_API_TOKEN;
  const defaultToken = process.env.TURSO_DEFAULT_TOKEN;
  const defaultDatabaseUrl = process.env.TURSO_DATABASE_URL;
  const sessionSecret = process.env.SESSION_SECRET;

  const client = createClient({
    url: defaultDatabaseUrl,
    authToken: defaultToken
  });

  logger.info(`creating user '${username}'`);
  await client.execute({
    sql: 'INSERT INTO users (username, email) VALUES (:username, :email) ON CONFLICT(username) DO NOTHING ON CONFLICT(email) DO NOTHING',
    args: {
      username,
      email
    }
  });

  const platformClient = createPlatformClient({
    org: 'chealt',
    token
  });

  try {
    await platformClient.databases.delete(username);
  } catch {
    logger.info('User database does not exist, skipping deletion');
  }

  logger.info(`creating user database '${username}'`);
  const { hostname } = await platformClient.databases.create(username, {
    group: 'users',
    seed: {
      type: 'database',
      name: 'empty'
    }
  });

  const url = `libsql://${hostname}`;

  logger.info(`creating user DB token for '${username}'`);
  const { jwt: authToken } = await platformClient.databases.createToken(username, {
    authorization: 'full-access'
  });

  const userClient = createClient({
    url,
    authToken
  });

  logger.info(`creating registration code for '${username}'`);
  const registrationCode = jwt.sign({ username }, sessionSecret, { expiresIn: '24h' });

  logger.info(`updating DB registration code for '${username}'`);
  await userClient.execute({
    sql: 'INSERT INTO users (name, registration_code, email) VALUES (:name, :registration_code, :email)',
    args: { name: username, registration_code: registrationCode, email } // eslint-disable-line camelcase
  });

  logger.info(`adding Cloudflare secret for '${username}'`);
  await Promise.all([
    addSecret({ scriptName: 'coffee', name: `TURSO_AUTH_TOKEN_${username.toUpperCase()}`, text: authToken }),
    addSecret({ scriptName: 'coffee', name: `TURSO_DATABASE_URL_${username.toUpperCase()}`, text: url })
  ]).catch((error) => {
    logger.error(`Failed to add Cloudflare secret for '${username}', please add manually`);

    throw error;
  });

  logger.info(`sending email with registration code for '${username}' to email: ${email}`);
  const t = locales({ locale });
  await sendEmail({
    to: email,
    content: content({ title: t('registrationEmailTitle'), username, registrationCode, locale }),
    subject: t('registrationEmailSubject')
  });
};
