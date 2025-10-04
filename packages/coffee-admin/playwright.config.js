import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testMatch: 'src/coffees/importFromCQI.js',
  timeout: 200_000,
  // reporter: 'html',
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          slowMo: 500 // the page we import from is slow, so we introduce some arbitrary lag
        }
      }
    }
  ]
});
