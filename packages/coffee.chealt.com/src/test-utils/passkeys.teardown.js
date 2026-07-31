import { config, test, expect } from '@test-utils/index.js';
import { registerPasskey } from '@test-utils/webauthn.js';

// The tests share a single user, so every run leaves its registered passkeys behind
test('deletes the passkeys left behind by the tests', async ({ page }) => {
  await registerPasskey(page);

  page.on('dialog', (dialog) => dialog.accept());

  await page.goto(`${config.url}/you/profile/passkeys`);

  const deleteButtons = page.getByRole('button', { name: /delete/iu });
  let remaining = await deleteButtons.count();

  while (remaining > 0) {
    await deleteButtons.first().click();

    remaining -= 1;

    await expect(deleteButtons).toHaveCount(remaining);
  }
});
