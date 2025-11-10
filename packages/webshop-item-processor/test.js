import { handler } from './src/index.js';
import { deflateSync } from 'node:zlib';

const url = 'https://stow.si/en/izdelek/finca-el-morito/';
const roasterId = 286;

const response = await fetch(url);

if (!response.ok) {
  throw new Error(`Failed to fetch webshop page ${url}`);
}

const html = (await response.text()).match(/<body[^>]*>[\s\S]*<\/body>/giu)[0];

console.info(`Invoke webshop processor for ${roasterId} and url: ${url}`);

await handler({ url, roasterId, html: deflateSync(html).toString('base64') });
