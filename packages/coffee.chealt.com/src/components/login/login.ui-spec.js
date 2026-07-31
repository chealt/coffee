import { cookieNameSession } from '../../server/authentication/config.js';
import { config, test, expect } from '@test-utils/index.js';
import { registerPasskey } from '@test-utils/webauthn.js';

const getSessionCookie = async (/** @type {import('@playwright/test').Page} */ page) =>
  (await page.context().cookies()).find((cookie) => cookie.name === cookieNameSession);

test.describe('login', { tag: '@auth' }, () => {
  test('logs in an existing user with a passkey', async ({ page }) => {
    await registerPasskey(page);

    expect(await getSessionCookie(page)).toBeTruthy();

    await page.context().clearCookies({ name: cookieNameSession });

    await page.goto(`${config.url}/you/collections`);

    await expect(page.getByRole('heading', { name: /login/iu, level: 1 })).toBeVisible();

    await page.getByRole('textbox', { name: /username or email/iu }).fill(config.user.email);
    await page.getByRole('button', { name: /login/iu }).click();

    await expect(page.getByRole('heading', { name: /collections/iu, level: 1 })).toBeVisible();
  });
});
