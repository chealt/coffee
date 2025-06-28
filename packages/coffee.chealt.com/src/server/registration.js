import { generateRegistrationOptions } from '@simplewebauthn/server';

import { relyingPartyName, relyingPartyID } from './authentication/config.js';
import { getUser, getPasskeys, recordRegistrationOptions } from './database/user.js';

const createRegistrationOptions = async (username) => {
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
