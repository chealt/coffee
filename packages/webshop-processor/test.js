import { handler } from './src/index.js';
import { deflateSync } from 'node:zlib';

const invokeLambda = async ({ payload }) => handler(payload);

const url = 'https://banibeans.si/pages/shop';
const roasterId = 285;

const response = await fetch(url);

if (!response.ok) {
  throw new Error(`Failed to fetch webshop page ${url}`);
}

const html = (await response.text()).match(/<body[^>]*>[\s\S]*<\/body>/giu)[0];

console.info(`Invoke webshop processor for ${roasterId} and url: ${url}`);

const result = await invokeLambda({
  functionName: 'webshopProcessor',
  payload: { url, roasterId, html: deflateSync(html).toString('base64') }
});

console.log(result);
