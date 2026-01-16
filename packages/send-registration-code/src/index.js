import { createClient } from '@libsql/client';
import { createClient as createPlatformClient } from '@tursodatabase/api';
import jwt from 'jsonwebtoken';

import { sendEmail, getSecret } from './AWS.js';
import logger from './Sentry/logger.js';
import content from './email-content.js';
import locales from './locales.json' with { type: 'json' };

export const handler = async ({ username, email, locale = 'en' }) => {
  if (!username) {
    logger.error('Username is not set');

    throw new Error('Username is not set');
  }

  if (!email) {
    logger.error('Email is not set');

    throw new Error('Email is not set');
  }

  const secrets = await getSecret({ name: 'sendRegistrationCode' });

  const token = secrets.TURSO_API_TOKEN;
  const defaultToken = secrets.TURSO_DEFAULT_TOKEN;
  const sessionSecret = secrets.SESSION_SECRET;

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

  logger.info(`creating user DB token for user: ${username}`);
  const { jwt: authToken } = await platformClient.databases.createToken(username, {
    authorization: 'full-access'
  });

  const userClient = createClient({
    url,
    authToken
  });

  logger.info(`creating registration code for user: ${username}`);
  const registrationCode = jwt.sign({ username }, sessionSecret, { expiresIn: '24h' });

  logger.info(`updating DB registration code for user: ${username}`);
  await userClient.execute({
    sql: 'UPDATE users SET registration_code = :registrationCode WHERE name = :username AND email = :email',
    args: { username, registrationCode, email }
  });

  logger.info(`sending email with registration code: ${registrationCode} to email: ${email}`);
  const localeContent = locales[locale] || locales.en;
  await sendEmail({
    to: email,
    content: content({ title: localeContent.registrationEmailTitle, username, registrationCode, locale }),
    subject: localeContent.registrationEmailSubject
  });
};
