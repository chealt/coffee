import { cookieNameSession } from '../../server/authentication/config.js';
import { config, test, expect } from '@test-utils/index.js';
import { addVirtualAuthenticator, signRegistrationCode } from '@test-utils/webauthn.js';

const registerNewPasskey = async (/** @type {import('@playwright/test').Page} */ page) => {
  const registrationCode = await signRegistrationCode(config.user.username);
  const requestPromise = page.waitForRequest('**/api/authentication/registration**');

  await page.goto(`${config.url}/registration/${config.user.username}?code=${registrationCode}`);

  await expect(page.getByRole('heading', { name: /registration/iu, level: 1 })).toBeVisible();

  await page.getByRole('button', { name: 'Register', exact: true }).click();

  const request = await requestPromise;
  const value = (await request.allHeaders())['x-e2e-identity'];
  console.log(`x-e2e-identity on ${request.url()}: present=${value !== undefined} length=${value?.length ?? 0}`);

  await page.waitForURL(`${config.url}/`);
};

const getSessionCookie = async (/** @type {import('@playwright/test').Page} */ page) =>
  (await page.context().cookies()).find((cookie) => cookie.name === cookieNameSession);

test.describe('login', () => {
  test('logs in an existing user with a passkey', async ({ page }) => {
    await addVirtualAuthenticator(page);

    await registerNewPasskey(page);

    expect(await getSessionCookie(page)).toBeTruthy();

    await page.context().clearCookies({ name: cookieNameSession });

    await page.goto(`${config.url}/you/collections`);

    await expect(page.getByRole('heading', { name: /login/iu, level: 1 })).toBeVisible();

    await page.getByRole('textbox', { name: /username or email/iu }).fill(config.user.email);
    await page.getByRole('button', { name: /login/iu }).click();

    await expect(page.getByRole('heading', { name: /collections/iu, level: 1 })).toBeVisible();
  });
});
