import { generateAuthenticationOptions } from '@simplewebauthn/server';

import { relyingPartyID } from './authentication/config.js';
import { getUser, getPasskeys, recordAuthenticationOptions } from './database/database.js';

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

  await recordAuthenticationOptions({ user, options });

  return options;
};

export { getAuthenticationOptions };
