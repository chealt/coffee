import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { decodeClientDataJSON } from '@simplewebauthn/server/helpers';

import {
  cookieNameSession,
  cookieNameUsername,
  relyingPartyID,
  origin
} from '../../../../server/authentication/config.js';
import { getSessionJWT } from '../../../../server/authentication/session.js';
import { claimChallenge } from '../../../../server/database/challenges.js';
import {
  getUser,
  getUserByUsernameOrEmail,
  getPasskey,
  updatePasskeyCounter
} from '../../../../server/database/user.js';
import logger from '../../../../server/utils/logger.js';

const error = ({ message, errorCode }) =>
  new Response(JSON.stringify({ error: message, errorCode }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' }
  });

const POST = async ({ request }) => {
  const { username, ...body } = await request.json();

  if (!username) {
    return error({ message: 'Username not found', errorCode: 'USER_NOT_FOUND' });
  }

  const userDefault = await getUserByUsernameOrEmail(username);

  if (!userDefault) {
    return error({ message: 'Username not found', errorCode: 'USER_NOT_FOUND' });
  }

  try {
    const user = await getUser(userDefault.username);

    if (!user) {
      return error({ message: 'Username not found', errorCode: 'USER_NOT_FOUND' });
    }

    // the ceremony is identified by the challenge the authenticator signed, so parallel
    // ceremonies for the same user cannot invalidate each other
    const { challenge } = decodeClientDataJSON(body.response.clientDataJSON);
    const currentOptions = await claimChallenge({ username: user.name, challenge, type: 'authentication' });

    if (!currentOptions) {
      return error({ message: 'Challenge not found', errorCode: 'CHALLENGE_NOT_FOUND' });
    }

    const passkey = await getPasskey({ username: user.name, credentialId: body.id });

    if (!passkey) {
      return error({ message: 'Passkey not found', errorCode: 'PASSKEY_NOT_FOUND' });
    }

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
      return error({ message: 'Verification failed', errorCode: 'VERIFICATION_FAILED' });
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
  } catch (verificationError) {
    logger.warn(verificationError);

    return error({ message: verificationError.message, errorCode: 'VERIFICATION_FAILED' });
  }
};

export { POST };
