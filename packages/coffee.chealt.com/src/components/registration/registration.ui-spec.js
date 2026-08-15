import { config, test } from '@test-utils/index.js';
import { addVirtualAuthenticator, signRegistrationCode } from '@test-utils/webauthn.js';

test.describe('registration', () => {
  test('registers with a challenge a parallel ceremony did not invalidate', async ({ page, context }) => {
    await addVirtualAuthenticator(page);

    const registrationCode = await signRegistrationCode(config.user.username);
    const registrationUrl = `${config.url}/registration/${config.user.username}?code=${registrationCode}`;

    await page.goto(registrationUrl);

    const newPage = await context.newPage();

    await newPage.goto(registrationUrl);
    await newPage.close();

    await page.getByRole('button', { name: 'Register', exact: true }).click();

    await page.waitForURL(`${config.url}/`);
  });
});
