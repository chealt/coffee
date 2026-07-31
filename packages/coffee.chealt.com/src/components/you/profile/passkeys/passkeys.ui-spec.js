import { config, test, expect } from '@test-utils/index.js';
import { addVirtualAuthenticator, signRegistrationCode } from '@test-utils/webauthn.js';

const registerPasskey = async (/** @type {import('@playwright/test').Page} */ page) => {
  await addVirtualAuthenticator(page);

  const registrationCode = await signRegistrationCode(config.user.username);

  await page.goto(`${config.url}/registration/${config.user.username}?code=${registrationCode}`);
  await page.getByRole('button', { name: 'Register', exact: true }).click();
  await page.waitForURL(`${config.url}/`);
};

test.describe('passkeys page', { tag: '@auth' }, () => {
  test('should render the login page when not logged in', async ({ page }) => {
    await page.goto(`${config.url}/you/profile/passkeys`);

    await expect(page.getByRole('heading', { name: /login/iu, level: 1 })).toBeVisible();
  });

  test('should list the passkeys of the logged in user', async ({ page }) => {
    await registerPasskey(page);

    await page.goto(`${config.url}/you/profile`);
    await page.getByRole('link', { name: /passkeys/iu }).click();

    await expect(page.getByRole('heading', { name: /passkeys/iu, level: 1 })).toBeVisible();
    await expect(page.getByText('Credential ID')).not.toHaveCount(0);
  });

  test('should delete all the passkeys', async ({ page }) => {
    await registerPasskey(page);

    page.on('dialog', (dialog) => dialog.accept());

    await page.goto(`${config.url}/you/profile/passkeys`);

    const deleteButtons = page.getByRole('button', { name: /delete/iu });
    let remaining = await deleteButtons.count();

    expect(remaining).toBeGreaterThan(0);

    while (remaining > 0) {
      await deleteButtons.first().click();

      remaining -= 1;

      await expect(deleteButtons).toHaveCount(remaining);
    }

    await page.reload();

    await expect(page.getByText(/no passkeys yet/iu)).toBeVisible();
  });
});
