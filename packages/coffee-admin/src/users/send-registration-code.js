import { createClient } from '@libsql/client';
import { createClient as createPlatformClient } from '@tursodatabase/api';
import jwt from 'jsonwebtoken';

import getContent from './email-content.js';
import { sendEmail } from '../AWS.js';
import logger from '../Sentry/logger.js';

const main = async ({ username, email }) => {
  if (!username) {
    logger.error('Username is not set');

    throw new Error('Username is not set');
  }

  if (!email) {
    logger.error('Email is not set');

    throw new Error('Email is not set');
  }

  const token = process.env.TURSO_API_TOKEN;
  const defaultToken = process.env.TURSO_DEFAULT_TOKEN;
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

  const platformClient = createPlatformClient({
    org: 'chealt',
    token
  });

  const { hostname } = await platformClient.databases.get(username);

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
    sql: 'UPDATE users SET registration_code = :registrationCode WHERE name = :username AND email = :email',
    args: { username, registrationCode, email }
  });

  logger.info(`sending email with registration code: ${registrationCode} to email: ${email}`);
  await sendEmail({
    to: email,
    content: getContent({ username, registrationCode }),
    subject: 'Registration email from centralbeans.com'
  });
};

export default main;
