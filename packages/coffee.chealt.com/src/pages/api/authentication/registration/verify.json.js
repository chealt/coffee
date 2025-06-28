import { verifyRegistrationResponse } from '@simplewebauthn/server';

import {
  origin,
  relyingPartyID,
  cookieNameUsername,
  cookieNameSession
} from '../../../../server/authentication/config.js';
import { getSessionJWT } from '../../../../server/authentication/session.js';
import { getUser, getRegistrationOptions, storeRegistration } from '../../../../server/database/user.js';

const POST = async ({ request }) => {
  const { username, ...registration } = await request.json();

  const user = await getUser(username);

  const currentOptions = await getRegistrationOptions(username);

  try {
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
          `${cookieNameSession}=${getSessionJWT({ user })}; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=${60 * 60 * 24};`
        ]
      ]
    });
  } catch (error) {
    console.error(error); // eslint-disable-line no-console

    return new Response({
      headers: {
        'Content-Type': 'application/json'
      },
      status: 400,
      body: JSON.stringify({ error: error.message })
    });
  }
};

export { POST };
