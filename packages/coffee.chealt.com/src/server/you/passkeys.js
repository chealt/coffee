import { getSessionUser } from '../authentication/session.js';
import { getPasskeys, getUser } from '../database/user.js';

const setPasskeys = async (context) => {
  const loggedInUser = await getSessionUser(context);

  if (loggedInUser) {
    const user = await getUser(loggedInUser.username);
    const passkeys = await getPasskeys(user);

    // the public key never leaves the server
    context.locals.passkeys = passkeys.map((passkey) => ({
      credentialId: passkey.credential_id,
      deviceType: passkey.device_type,
      transports: passkey.transports ? passkey.transports.split(',') : [],
      createdAt: passkey.created_at,
      lastUsedAt: passkey.last_used_at
    }));
  }
};

export { setPasskeys };
