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

if (process.env.CI && !process.env.localDevServer && !process.env.identityHeaderValue) {
  throw new Error('identityHeaderValue must be set in CI builds');
}

// CI splits the suite across parallel jobs, one shard each. Both values come from the
// workflow so the shard count lives in a single place there.
const shardIndex = Number(process.env.shardIndex) || 0;
const shardTotal = Number(process.env.shardTotal) || 0;
const isSharded = shardIndex > 0 && shardTotal > 1;

export default defineConfig({
  testDir: './src',
  testMatch: /.*\.ui-spec\.js/u,
  timeout: 30 * 1000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: '75%',
  reporter: [['html', { open: 'never' }], [process.env.CI ? 'github' : 'list']],
  use: {
    trace: 'on',
    video: 'on',
    // Disables the site's cross-document view transitions (gated behind
    // prefers-reduced-motion). Playwright's Chromium runs with the
    // RenderDocument feature disabled, which leaves those transitions
    // stuck and freezes rendering after JS-initiated navigations.
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
      use: getDevice('Desktop Chrome'),
      ...(isSharded ? {} : { teardown: 'cleanup' })
    },
    // The tests share a single user and the cleanup deletes all of its passkeys, so it
    // cannot take part in a sharded run: whichever shard it landed in would delete the
    // passkeys the other shards are still using. It is left out of the projects there so
    // no shard picks it up, and CI runs it once after every shard with an unsharded
    // `playwright test --project=cleanup`.
    ...(isSharded
      ? []
      : [
          {
            name: 'cleanup',
            testMatch: /.*\.teardown\.js/u,
            use: getDevice('Desktop Chrome')
          }
        ])
  ],
  ...(isSharded ? { shard: { current: shardIndex, total: shardTotal } } : {}),
  // When baseUrl is set the tests run against a deployed site (prod or a PR
  // preview), so the local server is not needed.
  ...(process.env.baseUrl
    ? {}
    : {
        webServer: {
          command: 'yarn build && yarn wrangler dev --port 4321 --show-interactive-dev-session false',
          url: 'http://localhost:4321/en/',
          timeout: 180 * 1000,
          reuseExistingServer: !process.env.CI,
          env: { WRANGLER_SEND_METRICS: 'false' }
        }
      })
});
