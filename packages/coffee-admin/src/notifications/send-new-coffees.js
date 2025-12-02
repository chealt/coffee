import { createClient } from '@libsql/client';
import { createClient as createPlatformClient } from '@tursodatabase/api';

import locales from './locales.json' with { type: 'json' };
// eslint-disable-next-line import/no-unresolved
import coffees from '../../data/coffees.json' with { type: 'json' };
// eslint-disable-next-line import/no-unresolved
import newCoffeeIds from '../../data/newCoffeeIds.json' with { type: 'json' };
import { sendEmail } from '../AWS.js';
import client from '../turso.js';
import { getContentHash } from '../utils.js';
import getEmailContent from './new-coffees-email-content.js';

const notificationType = 'newCoffees';

/* eslint-disable-next-line complexity */
const main = async () => {
  const dataHash = await getContentHash({ arrayBuffer: Buffer.from(JSON.stringify(newCoffeeIds)) });
  const newCoffees = coffees.filter(({ id }) => newCoffeeIds.includes(id));

  if (!newCoffees.length) {
    console.info('No new coffees to send.');

    return undefined;
  }

  const { rows: users } = await client.execute({
    sql: 'SELECT u.username, u.email FROM users u LEFT JOIN notifications n ON u.username = n.username AND u.email = n.email AND n.type = :notificationType AND n.data_hash = :dataHash WHERE n.id IS NULL',
    args: { dataHash, notificationType }
  });

  if (!users.length) {
    console.info('No new coffees to send.');

    return undefined;
  }

  const token = process.env.TURSO_API_TOKEN;

  if (!token) {
    throw new Error('TURSO_API_TOKEN is not set');
  }

  const platformClient = createPlatformClient({
    org: 'chealt',
    token
  });

  for (const { username, email } of users) {
    const { hostname } = await platformClient.databases.get(username);

    const url = `libsql://${hostname}`;

    console.info(`creating user DB token for: ${username}`);
    const { jwt: authToken } = await platformClient.databases.createToken(username, {
      authorization: 'full-access'
    });

    const userClient = createClient({
      url,
      authToken
    });

    const results = await userClient.execute({
      sql: 'SELECT value FROM form_data WHERE key = "settings"'
    });
    const settings = JSON.parse(results.rows[0]?.value || '{}');

    if (settings?.newCoffeeNotification !== 'on') {
      console.info(
        `Skipping sending notification for user ${username} with email ${email} because notification is off`
      );

      continue;
    }

    console.info(`Preparing new coffee notification to ${username} with email ${email}`);

    console.info(`Saving notification to DB for user: ${username} with email: ${email}`);
    await client.execute({
      sql: 'INSERT INTO notifications (username, email, type, data_hash) VALUES (:username, :email, :notificationType, :dataHash)',
      args: { username, email, notificationType, dataHash }
    });

    console.info(`Sending notification to user ${username} with email: ${email}`);
    const locale = settings.language || 'en';
    const localeContent = locales[locale] || locales.en;
    const content = getEmailContent({ newCoffees, localeContent, locale });

    console.log(content);

    await sendEmail({
      to: email,
      content,
      subject: localeContent.newCoffeesEmailSubject
    });
  }

  return undefined;
};

export default main;
