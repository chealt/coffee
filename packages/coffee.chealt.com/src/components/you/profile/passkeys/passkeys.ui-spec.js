import { cookieNameSession } from '../../../../server/authentication/config.js';
import { config, test, expect } from '@test-utils/index.js';
import { registerPasskey } from '@test-utils/webauthn.js';

const passkeysUrl = `${config.url}/you/profile/passkeys`;

test.describe('passkeys page', () => {
  test('should render the login page when not logged in', async ({ page }) => {
    await page.goto(passkeysUrl);

    await expect(page.getByRole('heading', { name: /login/iu, level: 1 })).toBeVisible();
  });

  test('should list the passkeys of the logged in user', async ({ page }) => {
    await registerPasskey(page);

    await page.goto(`${config.url}/you/profile`);
    await page.getByRole('link', { name: /passkeys/iu }).click();

    await expect(page.getByRole('heading', { name: /passkeys/iu, level: 1 })).toBeVisible();
    await expect(page.getByText('Credential ID')).not.toHaveCount(0);
  });

  test('should record when a passkey was last used', async ({ page }) => {
    const { credentialId } = await registerPasskey(page);

    await page.goto(passkeysUrl);

    const passkey = page.getByRole('listitem').filter({ hasText: credentialId });

    // registering stores the creation date but the passkey has not authenticated anyone yet
    await expect(passkey.getByText(/never/iu)).toBeVisible();

    await page.context().clearCookies({ name: cookieNameSession });
    await page.goto(passkeysUrl);
    await page.getByRole('textbox', { name: /username or email/iu }).fill(config.user.email);
    await page.getByRole('button', { name: /login/iu }).click();

    await expect(page.getByRole('heading', { name: /passkeys/iu, level: 1 })).toBeVisible();

    await expect(passkey.getByText(/never/iu)).toHaveCount(0);
  });
});
