/* eslint-disable camelcase, no-console */
import { createClient } from '@libsql/client';
import { createClient as createPlatformClient } from '@tursodatabase/api';
import jwt from 'jsonwebtoken';

import { addSecret } from '../cloudflare.js';
import { sendEmail } from './email.js';

if (!process.argv?.some((arg) => arg.includes('--username='))) {
  throw new Error('Username is not set');
}

if (!process.argv?.some((arg) => arg.includes('--email='))) {
  throw new Error('Email is not set');
}

const username = process.argv.find((arg) => arg.includes('--username')).replace('--username=', '');
const email = process.argv.find((arg) => arg.includes('--email')).replace('--email=', '');

const token = process.env.TURSO_API_TOKEN;
const defaultToken = process.env.TURSO_DEFAULT_TOKEN;
const defaultDatabaseUrl = process.env.TURSO_DATABASE_URL;
const sessionSecret = process.env.SESSION_SECRET;

if (!token) {
  throw new Error('TURSO_API_TOKEN is not set');
}

if (!defaultToken) {
  throw new Error('TURSO_DEFAULT_TOKEN is not set');
}

if (!sessionSecret) {
  throw new Error('SESSION_SECRET is not set');
}

const client = createClient({
  url: defaultDatabaseUrl,
  authToken: defaultToken
});

console.info('creating user...');
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
  console.error(error);

  console.log('User database does not exist, skipping deletion');
}

console.info('creating user database...');
const { hostname } = await platformClient.databases.create(username, {
  group: 'users',
  seed: {
    type: 'database',
    name: 'empty'
  }
});

const url = `libsql://${hostname}`;

console.info('creating user DB token...');
const { jwt: authToken } = await platformClient.databases.createToken(username, {
  authorization: 'full-access'
});

const userClient = createClient({
  url,
  authToken
});

console.info('creating registration code...');
const registrationCode = jwt.sign({ username }, sessionSecret, { expiresIn: '24h' });

console.info('updating DB registration code...');
await userClient.execute({
  sql: 'INSERT INTO users (name, registration_code, email) VALUES (:name, :registration_code, :email)',
  args: { name: username, registration_code: registrationCode, email }
});

console.info('adding Cloudflare secret...');
await Promise.all([
  addSecret({ scriptName: 'coffee', name: `TURSO_AUTH_TOKEN_${username.toUpperCase()}`, text: authToken }),
  addSecret({ scriptName: 'coffee', name: `TURSO_DATABASE_URL_${username.toUpperCase()}`, text: url })
]).catch((error) => {
  console.error('Failed to add Cloudflare secret, please add manually');

  throw new Error(error);
});

console.info(`sending email with registration code: ${registrationCode} to email: ${email}`);
await sendEmail({ to: email, username, registrationCode });

// DEV setup (optional)
console.info(`add token: TURSO_AUTH_TOKEN_${username.toUpperCase()}=${authToken} to dev env`);
console.info(`add url: TURSO_DATABASE_URL_${username.toUpperCase()}=${url} to dev env`);
