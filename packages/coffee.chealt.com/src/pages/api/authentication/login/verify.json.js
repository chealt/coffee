import { verifyAuthenticationResponse } from '@simplewebauthn/server';

import {
  cookieNameSession,
  cookieNameUsername,
  relyingPartyID,
  origin
} from '../../../../server/authentication/config.js';
import { getSessionJWT } from '../../../../server/authentication/session.js';
import {
  getUser,
  getUserByUsernameOrEmail,
  getAuthenticationOptions,
  getPasskey,
  updatePasskeyCounter
} from '../../../../server/database/user.js';
import logger from '../../../../server/utils/logger.js';

const POST = async ({ request }) => {
  const { username, ...body } = await request.json();

  if (!username) {
    return new Response(JSON.stringify({ error: 'Username not found' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const userDefault = await getUserByUsernameOrEmail(username);
  const user = await getUser(userDefault.username);
  const currentOptions = await getAuthenticationOptions(user.name);
  const passkey = await getPasskey({ username: user.name, credentialId: body.id });

  try {
    const {
      verified,
      authenticationInfo: { newCounter, credentialID }
    } = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: currentOptions.challenge,
      expectedOrigin: origin,
      expectedRPID: relyingPartyID,
      credential: {
        id: passkey.credential_id,
        publicKey: new Uint8Array(passkey.public_key),
        counter: passkey.counter,
        transports: passkey.transports.split(',')
      }
    });

    if (!verified) {
      return new Response(JSON.stringify({ error: 'Verification failed' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    await updatePasskeyCounter({
      username: user.name,
      credentialID,
      newCounter
    });

    return new Response(JSON.stringify({ verified: true }), {
      status: 200,
      headers: [
        ['Content-Type', 'application/json'],
        [
          'Set-Cookie',
          `${cookieNameSession}=${await getSessionJWT({ user })}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${60 * 60 * 24 * 7};`
        ],
        [
          'Set-Cookie',
          `${cookieNameUsername}=${user.name}; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=${60 * 60 * 24 * 365}`
        ]
      ]
    });
  } catch (error) {
    logger.warn(error);

    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export { POST };
