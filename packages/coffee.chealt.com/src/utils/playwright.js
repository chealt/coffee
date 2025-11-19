import { test as baseTest } from '@playwright/test';
import { locatorFixtures as fixtures } from '@playwright-testing-library/test/fixture.js';

const test = baseTest.extend(fixtures);
const { expect } = test;

const config = {
  url: 'http://localhost:4321'
};

export { test, expect, config };
