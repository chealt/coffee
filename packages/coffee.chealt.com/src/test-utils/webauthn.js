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

// CDP reports credential IDs as base64, the site stores and renders them as base64url
const toBase64URL = (base64) => base64.replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');

// Registering also signs the user in, so this is the way to get an authenticated page.
// The tests share a user, so the credential ID is how a test finds the passkey it created.
const registerPasskey = async (/** @type {import('@playwright/test').Page} */ page) => {
  const { client, authenticatorId } = await addVirtualAuthenticator(page);

  const registrationCode = await signRegistrationCode(config.user.username);

  await page.goto(`${config.url}/registration/${config.user.username}?code=${registrationCode}`);
  await page.getByRole('button', { name: 'Register', exact: true }).click();
  await page.waitForURL(`${config.url}/`);

  const { credentials } = await client.send('WebAuthn.getCredentials', { authenticatorId });

  return { credentialId: toBase64URL(credentials[0].credentialId) };
};

export { addVirtualAuthenticator, registerPasskey, signRegistrationCode };
