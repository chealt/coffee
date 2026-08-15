import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { decodeClientDataJSON } from '@simplewebauthn/server/helpers';

import {
  origin,
  relyingPartyID,
  cookieNameUsername,
  cookieNameSession
} from '../../../../server/authentication/config.js';
import { getSessionJWT } from '../../../../server/authentication/session.js';
import { claimChallenge } from '../../../../server/database/challenges.js';
import { getUser, storeRegistration } from '../../../../server/database/user.js';
import logger from '../../../../server/utils/logger.js';

const getErrorResponse = ({ message, errorCode }) =>
  new Response(JSON.stringify({ error: message, errorCode }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' }
  });

const POST = async ({ request }) => {
  const { username, ...registration } = await request.json();

  try {
    const user = await getUser(username);

    if (!user) {
      return getErrorResponse({ message: 'Username not found', errorCode: 'USER_NOT_FOUND' });
    }

    const { challenge } = decodeClientDataJSON(registration.response.clientDataJSON);
    const currentOptions = await claimChallenge({ username: user.name, challenge, type: 'registration' });

    if (!currentOptions) {
      return getErrorResponse({ message: 'Challenge not found', errorCode: 'CHALLENGE_NOT_FOUND' });
    }

    const verification = await verifyRegistrationResponse({
      response: registration,
      expectedChallenge: currentOptions.challenge,
      expectedOrigin: origin,
      expectedRPID: relyingPartyID
    });

    if (verification) {
      await storeRegistration({ user, verification, registrationOptions: currentOptions });
    }

    return new Response(JSON.stringify({ verified: verification.verified }), {
      status: 200,
      headers: [
        ['Content-Type', 'application/json'],
        [
          'Set-Cookie',
          `${cookieNameUsername}=${username}; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=${60 * 60 * 24 * 365}`
        ],
        [
          'Set-Cookie',
          `${cookieNameSession}=${await getSessionJWT({ user })}; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=${60 * 60 * 24};`
        ]
      ]
    });
  } catch (error) {
    logger.error(error);

    return getErrorResponse({ message: error.message, errorCode: 'REGISTRATION_FAILED' });
  }
};

export { POST };
