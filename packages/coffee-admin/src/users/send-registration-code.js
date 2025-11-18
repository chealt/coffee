import { createClient } from '@libsql/client';
import { createClient as createPlatformClient } from '@tursodatabase/api';
import jwt from 'jsonwebtoken';

import { sendEmail } from './email.js';

const main = async ({ username, email }) => {
  if (!username) {
    throw new Error('Username is not set');
  }

  if (!email) {
    throw new Error('Email is not set');
  }

  const token = process.env.TURSO_API_TOKEN;
  const defaultToken = process.env.TURSO_DEFAULT_TOKEN;
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

  const platformClient = createPlatformClient({
    org: 'chealt',
    token
  });

  const { hostname } = await platformClient.databases.get(username);

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
    sql: 'UPDATE users SET registration_code = :registrationCode WHERE name = :username AND email = :email',
    args: { username, registrationCode, email }
  });

  console.info(`sending email with registration code: ${registrationCode} to email: ${email}`);
  await sendEmail({ to: email, username, registrationCode });
};

export default main;
