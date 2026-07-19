import { existsSync } from 'node:fs';

import { defineConfig, devices } from '@playwright/test';

if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

// Helper to remove 'screen' to avoid conflict with @playwright-testing-library/test's screen fixture
const getDevice = (name) => {
  const { screen, ...device } = devices[name]; // eslint-disable-line no-unused-vars

  return device;
};

export default defineConfig({
  testDir: './src',
  testMatch: /.*\.ui-spec\.js/u,
  timeout: 10 * 1000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], [process.env.CI ? 'github' : 'list']],
  use: {
    trace: 'on',
    video: 'on',
    // Disables the site's cross-document view transitions (gated behind
    // prefers-reduced-motion). Playwright's Chromium runs with the
    // RenderDocument feature disabled, which leaves those transitions
    // stuck and freezes rendering after JS-initiated navigations.
    // Playwright 1.61 drops a top-level `reducedMotion` test option,
    // so it has to go through `contextOptions`.
    contextOptions: {
      extraHTTPHeaders: {
        'x-e2e-identity': process.env.identityHeaderValue || ''
      },
      reducedMotion: 'reduce'
    }
  },
  projects: [
    {
      name: 'chromium',
      use: getDevice('Desktop Chrome')
    }
  ],
  webServer: {
    command: 'yarn dev',
    port: 4321,
    reuseExistingServer: true
  }
});
