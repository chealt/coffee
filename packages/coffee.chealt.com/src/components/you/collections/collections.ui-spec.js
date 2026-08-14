// import { scanPage } from '../../../test-utils/a11y.js';
import { config, test, expect } from '../../../test-utils/index.js';
import { registerPasskey } from '../../../test-utils/webauthn.js';

// The smallest valid PNG, the upload only needs real image bytes to hash and cache
const coffeeImage = {
  name: 'coffee.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  )
};

const itemUrlPattern = /\/you\/collections\/[^/]+\/items\/[^/]+/u;

test.describe('collections pages', () => {
  test('should render the login page when not logged in', async ({ page }) => {
    await page.goto(`${config.url}/you/collections`);

    await expect(page).toHaveTitle('Central Beans');

    await expect(page.getByRole('heading', { name: /login/iu, level: 1 })).toBeVisible();

    await page.getByRole('textbox', { name: /username or email/iu }).fill(config.user.email);
  });

  test('adds a new image to a collection', { tag: '@auth' }, async ({ page }) => {
    await registerPasskey(page);

    await page.goto(`${config.url}/you/collections`);

    // the upload is handed over to the service worker, which only takes over once activated
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));

    const fileChooserPromise = page.waitForEvent('filechooser');

    await page
      .getByRole('link', { name: /add coffee/iu })
      .first()
      .click();

    await (await fileChooserPromise).setFiles(coffeeImage);

    // a new item is created for the image, and the page navigates to it
    await page.waitForURL(itemUrlPattern);

    await expect(page.getByRole('img').first()).toBeVisible();

    // the tests share one user, so the item must not be left behind
    page.on('dialog', (dialog) => dialog.accept());

    await page.getByRole('button', { name: /more/iu }).click();
    // the item page also has a delete button outside the menu, so scope it to the open dialog
    await page
      .getByRole('dialog')
      .getByRole('button', { name: /delete/iu })
      .click();

    await expect(page).not.toHaveURL(itemUrlPattern);
  });
});
