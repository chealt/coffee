import { SignJWT } from 'jose';
import { config } from '@test-utils/index.js';

const addVirtualAuthenticator = async (page) => {
  const client = await page.context().newCDPSession(page);

  await client.send('WebAuthn.enable');

  const { authenticatorId } = await client.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true
    }
  });

  return { client, authenticatorId };
};

const signRegistrationCode = (username) =>
  new SignJWT({ username }).setProtectedHeader({ alg: 'HS256' }).sign(new TextEncoder().encode(config.sessionSecret));

export { addVirtualAuthenticator, signRegistrationCode };
