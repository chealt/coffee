import { generateRegistrationOptions } from '@simplewebauthn/server';

import { relyingPartyName, relyingPartyID } from './authentication/config.js';
import { getUser, getPasskeys, recordRegistrationOptions } from './database/database.js';

const validateUserId = (userId) => {
  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!import.meta.env[`TURSO_DATABASE_URL_${userId.toUpperCase()}`]) {
    throw new Error(`TURSO_DATABASE_URL_${userId.toUpperCase()} is not set`);
  }

  if (!import.meta.env[`TURSO_AUTH_TOKEN_${userId.toUpperCase()}`]) {
    throw new Error(`TURSO_AUTH_TOKEN_${userId.toUpperCase()} is not set`);
  }
};

const createRegistrationOptions = async (username) => {
  validateUserId(username);

  const user = await getUser(username);
  const passkeys = await getPasskeys(user);

  const options = await generateRegistrationOptions({
    rpName: relyingPartyName,
    rpID: relyingPartyID,
    userName: user.name,
    attestationType: 'none',
    excludeCredentials: passkeys.map((passkey) => ({
      id: passkey.credential_id,
      transports: passkey.transports.split(',')
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
      authenticatorAttachment: 'platform'
    }
  });

  await recordRegistrationOptions({ user, options });

  return options;
};

export { createRegistrationOptions };
