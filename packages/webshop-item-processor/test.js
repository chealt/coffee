import { handler } from './src/index.js';
import { deflateSync } from 'node:zlib';

const urls = ['https://www.nordbeans.com/honduras_z3564/'];
const roasterId = 288;

for (const url of urls) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch webshop page ${url}`);
  }

  const html = (await response.text()).match(/<body[^>]*>[\s\S]*<\/body>/giu)[0];

  console.info(`Invoke webshop processor for ${roasterId} and url: ${url}`);

  try {
    await handler({ url, roasterId, html: deflateSync(html).toString('base64') });
  } catch (error) {
    console.error(`Failed to process ${url}`, error);
  }
}
