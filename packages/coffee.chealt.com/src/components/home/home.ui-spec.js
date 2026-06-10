import { scanPage } from '../../test-utils/a11y.js';
import { config, test, expect } from '../../test-utils/index.js';

test('should render the home page with the correct headings', async ({ page }) => {
  await page.goto(config.url);

  await expect(page).toHaveTitle('Central Beans');

  await expect(page.getByRole('heading', { name: /for you/iu, level: 2 })).toBeVisible();
  await expect(page.getByRole('heading', { name: /fancy me/iu, level: 2 })).toBeVisible();
  await expect(page.getByRole('heading', { name: /budget friendly/iu, level: 2 })).toBeVisible();
  await expect(page.getByRole('heading', { name: /roasters/iu, level: 2 })).toBeVisible();
  await expect(page.getByRole('heading', { name: /origin countries/iu, level: 2 })).toBeVisible();
  await expect(page.getByRole('heading', { name: /^countries/iu, level: 2 })).toBeVisible();
  await expect(page.getByRole('heading', { name: /your taste/iu, level: 2 })).toBeVisible();
  await expect(page.getByRole('heading', { name: /i feel lucky/iu, level: 2 })).toBeVisible();

  await scanPage({ page });
});
