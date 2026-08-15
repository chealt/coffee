import { config, test, expect } from '@test-utils/index.js';
import { addVirtualAuthenticator, signRegistrationCode } from '@test-utils/webauthn.js';

test.describe('registration', { tag: '@auth' }, () => {
  test('registers with a challenge a parallel ceremony did not invalidate', async ({ page }) => {
    await addVirtualAuthenticator(page);

    const registrationCode = await signRegistrationCode(config.user.username);
    const registrationUrl = `${config.url}/registration/${config.user.username}?code=${registrationCode}`;

    // the registration page embeds the options it was rendered with
    await page.goto(registrationUrl);

    // rendering the page again issues a second challenge, as a reload in another tab would
    const secondRender = await page.request.get(registrationUrl);

    expect(secondRender.ok()).toBe(true);

    await page.getByRole('button', { name: 'Register', exact: true }).click();

    await page.waitForURL(`${config.url}/`);
  });
});
