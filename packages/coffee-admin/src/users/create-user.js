import { createClient } from '@libsql/client';
import { createClient as createPlatformClient } from '@tursodatabase/api';
import jwt from 'jsonwebtoken';

import content from './email-content.js';
import locales from './locales.json' with { type: 'json' };
import { sendEmail } from '../AWS.js';
import logger from '../Sentry/logger.js';
import { addSecret } from '../cloudflare.js';

if (!process.argv?.some((arg) => arg.includes('--username='))) {
  logger.error('Username is not set');

  throw new Error('Username is not set');
}

if (!process.argv?.some((arg) => arg.includes('--email='))) {
  logger.error('Email is not set');

  throw new Error('Email is not set');
}

const username = process.argv.find((arg) => arg.includes('--username')).replace('--username=', '');
const email = process.argv.find((arg) => arg.includes('--email')).replace('--email=', '');

const token = process.env.TURSO_API_TOKEN;
const defaultToken = process.env.TURSO_DEFAULT_TOKEN;
const defaultDatabaseUrl = process.env.TURSO_DATABASE_URL;
const sessionSecret = process.env.SESSION_SECRET;

if (!token) {
  logger.error('TURSO_API_TOKEN is not set');

  throw new Error('TURSO_API_TOKEN is not set');
}

if (!defaultToken) {
  logger.error('TURSO_DEFAULT_TOKEN is not set');

  throw new Error('TURSO_DEFAULT_TOKEN is not set');
}

if (!sessionSecret) {
  logger.error('SESSION_SECRET is not set');

  throw new Error('SESSION_SECRET is not set');
}

const client = createClient({
  url: defaultDatabaseUrl,
  authToken: defaultToken
});

logger.info('creating user...');
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
} catch (error) {
  logger.error(error);

  logger.info('User database does not exist, skipping deletion');
}

logger.info('creating user database...');
const { hostname } = await platformClient.databases.create(username, {
  group: 'users',
  seed: {
    type: 'database',
    name: 'empty'
  }
});

const url = `libsql://${hostname}`;

logger.info('creating user DB token...');
const { jwt: authToken } = await platformClient.databases.createToken(username, {
  authorization: 'full-access'
});

const userClient = createClient({
  url,
  authToken
});

logger.info('creating registration code...');
const registrationCode = jwt.sign({ username }, sessionSecret, { expiresIn: '24h' });

logger.info('updating DB registration code...');
await userClient.execute({
  sql: 'INSERT INTO users (name, registration_code, email) VALUES (:name, :registration_code, :email)',
  args: { name: username, registration_code: registrationCode, email } // eslint-disable-line camelcase
});

logger.info('adding Cloudflare secret...');
await Promise.all([
  addSecret({ scriptName: 'coffee', name: `TURSO_AUTH_TOKEN_${username.toUpperCase()}`, text: authToken }),
  addSecret({ scriptName: 'coffee', name: `TURSO_DATABASE_URL_${username.toUpperCase()}`, text: url })
]).catch((error) => {
  logger.error('Failed to add Cloudflare secret, please add manually');

  throw new Error(error);
});

logger.info(`sending email with registration code: ${registrationCode} to email: ${email}`);
const locale = process.env.LOCALE || 'en';
const localeContent = locales[locale] || locales.en;
await sendEmail({
  to: email,
  content: content({ username, registrationCode }),
  subject: localeContent.registrationEmailSubject
});

// DEV setup (optional)
console.info(`add token: TURSO_AUTH_TOKEN_${username.toUpperCase()}=${authToken} to dev env`);
console.info(`add url: TURSO_DATABASE_URL_${username.toUpperCase()}=${url} to dev env`);
