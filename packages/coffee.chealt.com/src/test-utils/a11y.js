import { expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createHtmlReport } from 'axe-html-reporter';

const reportPaths = [];

const scanPage = async ({ page, testName }) => {
  const { pathname } = new URL(page.url());
  const cleanPathname = pathname === '/' ? 'home' : pathname.replace(/\//g, '-');

  if (!reportPaths.includes(cleanPathname)) {
    reportPaths.push(cleanPathname);
  }

  const accessibilityScanResults = await new AxeBuilder({ page }).setLegacyMode(true).analyze();

  createHtmlReport({
    results: accessibilityScanResults,
    options: { outputDir: 'a11y-report', reportFileName: `${cleanPathname}${testName ? `-${testName}` : ''}.html` }
  });

  expect(accessibilityScanResults.violations).toEqual([]);
};

export { scanPage };
