// import { scanPage } from '../../../test-utils/a11y.js';
import { config, test, expect } from '../../../test-utils/index.js';

test.describe('collections pages', () => {
  test('should render the login page when not logged in', async ({ page }) => {
    await page.goto(`${config.url}/you/collections`);

    await expect(page).toHaveTitle('Central Beans');

    await expect(page.getByRole('heading', { name: /login/iu, level: 1 })).toBeVisible();

    await page.getByRole('textbox', { name: /username or email/iu }).fill(config.user.email);
  });
});
