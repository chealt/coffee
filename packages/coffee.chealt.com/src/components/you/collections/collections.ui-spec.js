// import { scanPage } from '../../../test-utils/a11y.js';
import { config, test, expect } from '../../../test-utils/index.js';
import { registerPasskey } from '../../../test-utils/webauthn.js';

const coffeeImage = {
  name: 'coffee.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  )
};

const itemUrlPattern = /\/you\/collections\/[^/]+\/items\/[^/]+/u;
const imageBucket = 'centralbeans-coffee-images';

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

    const fileChooserPromise = page.waitForEvent('filechooser');

    await page
      .getByRole('link', { name: /add coffee/iu })
      .first()
      .click();

    const uploadResponse = page
      .context()
      .waitForEvent(
        'response',
        (response) => response.request().method() === 'PUT' && response.url().includes(imageBucket)
      );

    await (await fileChooserPromise).setFiles(coffeeImage);

    await expect(page.getByRole('heading', { name: /details/iu, level: 1 })).toBeVisible();

    expect((await uploadResponse).status()).toBe(200);

    page.on('dialog', (dialog) => dialog.accept());

    await page.getByRole('button', { name: /delete/iu }).click();

    await expect(page).not.toHaveURL(itemUrlPattern);
  });
});
