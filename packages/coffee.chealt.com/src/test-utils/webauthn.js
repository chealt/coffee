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

// Registering also signs the user in, so this is the way to get an authenticated page
const registerPasskey = async (/** @type {import('@playwright/test').Page} */ page) => {
  await addVirtualAuthenticator(page);

  const registrationCode = await signRegistrationCode(config.user.username);

  await page.goto(`${config.url}/registration/${config.user.username}?code=${registrationCode}`);
  await page.getByRole('button', { name: 'Register', exact: true }).click();
  await page.waitForURL(`${config.url}/`);
};

export { addVirtualAuthenticator, registerPasskey, signRegistrationCode };
