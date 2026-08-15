import { generateAuthenticationOptions } from '@simplewebauthn/server';

import { relyingPartyID } from './authentication/config.js';
import { recordChallenge } from './database/challenges.js';
import { getUser, getPasskeys } from './database/user.js';

const getAuthenticationOptions = async (username) => {
  const user = await getUser(username);
  const userPasskeys = await getPasskeys(user);

  const options = await generateAuthenticationOptions({
    rpID: relyingPartyID,
    allowCredentials: userPasskeys.map((passkey) => ({
      id: passkey.credential_id,
      transports: passkey.transports.split(',')
    }))
  });

  await recordChallenge({ user, type: 'authentication', options });

  return options;
};

export { getAuthenticationOptions };
