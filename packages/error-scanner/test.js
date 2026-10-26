import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isErrorMessage } from './src/lib/aws.js';

const lambdaLine = (level, message) =>
  `2026-10-21T21:00:25.769Z\ta4b05c54-9319-4db2-97b6-9462ca17700c\t${level}\t${message}`;

describe('isErrorMessage', () => {
  it('rejects INFO lines whose URLs contain keyword substrings like exceptional', () => {
    const samples = [
      'https://manhattancoffeeroasters.com/product/coffees/exceptional/bombe/',
      'https://manhattancoffeeroasters.com/product/coffees/exceptional/el-paseo/',
      'https://manhattancoffeeroasters.com/product/coffees/exceptional/sweet-valley/'
    ];

    for (const url of samples) {
      assert.equal(isErrorMessage(lambdaLine('INFO', `Checking coffee: ${url}`)), false);
    }
  });

  it('accepts error-level log lines', () => {
    const samples = [
      lambdaLine('ERROR', 'Fetch failed for https://example.com/coffee/ (ETIMEDOUT)'),
      lambdaLine('ERROR', "TypeError: Cannot read properties of undefined (reading 'id')"),
      lambdaLine('ERROR', 'Invoke Error {"errorType":"RangeError","errorMessage":"Iterable length is non-finite"}')
    ];

    for (const message of samples) {
      assert.equal(isErrorMessage(message), true);
    }
  });

  it('accepts runtime failure lines without a level tag', () => {
    const samples = [
      '2026-10-21T21:00:55.999Z\ta4b05c54-9319-4db2-97b6-9462ca17700c\tTask timed out after 30.00 seconds',
      'ERROR UnhandledPromiseRejection: TypeError: terminated',
      'FetchError: unexpected end of file'
    ];

    for (const message of samples) {
      assert.equal(isErrorMessage(message), true);
    }
  });
});
