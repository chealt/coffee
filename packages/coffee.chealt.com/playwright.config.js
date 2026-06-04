import { defineConfig, devices } from '@playwright/test';

// Helper to remove 'screen' to avoid conflict with @playwright-testing-library/test's screen fixture
const getDevice = (name) => {
  const { screen, ...device } = devices[name]; // eslint-disable-line no-unused-vars

  return device;
};

export default defineConfig({
  testDir: './src',
  testMatch: /.*\.ui-spec\.js/u,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], [process.env.CI ? 'github' : 'list']],
  use: {
    trace: 'on-first-retry',
    video: 'on'
  },
  projects: [
    {
      name: 'chromium',
      use: getDevice('Desktop Chrome')
    },
    {
      name: 'Mobile Chrome',
      use: getDevice('Pixel 5')
    },
    {
      name: 'Mobile Safari',
      use: getDevice('iPhone 12')
    }
  ],
  webServer: {
    command: 'yarn dev',
    port: 4321
  }
});
