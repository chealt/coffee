import jwt from 'jsonwebtoken';

import { sessionSecret } from './authentication/config.js';
import { recordUser } from './database/user.js';

if (!sessionSecret) {
  throw new Error('sessionSecret is not set');
}

const username = process.argv[2]?.replace('--username=', '');
const email = process.argv[3]?.replace('--email=', '');

if (!username) {
  throw new Error('No username provided, please use --username=<username>');
}

if (!email) {
  throw new Error('No email provided, please use --email=<email>');
}

const addUser = async () => {
  const registrationCode = jwt.sign({ username }, sessionSecret, { expiresIn: '24h' });

  try {
    await recordUser({
      username,
      registrationCode,
      email
    });
  } catch (error) {
    console.error(error); // eslint-disable-line no-console

    throw new Error('Failed to add / update user');
  }
};

await addUser();
