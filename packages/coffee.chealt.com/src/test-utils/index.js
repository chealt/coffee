import { test as baseTest } from '@playwright/test';
import { locatorFixtures as fixtures } from '@playwright-testing-library/test/fixture.js';
import { measure, reportPerformanceHtml } from './performance.js';

const test = baseTest.extend({
  ...fixtures,
  collectPerformance: [true, { option: true }],
  page: async ({ page, collectPerformance }, use, testInfo) => {
    await use(page);

    if (collectPerformance) {
      try {
        const metrics = await measure({ page });
        const htmlReport = reportPerformanceHtml(metrics, page.url());

        await testInfo.attach('Performance Report', {
          body: htmlReport,
          contentType: 'text/html'
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to collect performance metrics:', error);
      }
    }
  }
});

const { expect } = test;

const config = {
  url: process.env.baseUrl || 'http://localhost:4321'
};

export { test, expect, config };
