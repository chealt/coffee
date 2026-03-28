import { handler } from './src/index.js';
import { deflateSync } from 'node:zlib';
import roasters from '../coffee.chealt.com/data/roasters.json' with { type: 'json' };

const roasterId = process.env.ROASTER_ID;

if (!roasterId) {
  throw new Error('No roaster id found, please provide a ROASTER_ID environment variable');
}

const url = roasters.find(({ id }) => id === Number(roasterId))?.webshop;

if (!url) {
  throw new Error(`No webshop url found for roaster id ${roasterId}`);
}

const response = await fetch(url);

if (!response.ok) {
  throw new Error(`Failed to fetch webshop page ${url}`);
}

const html = (await response.text()).match(/<body[^>]*>[\s\S]*<\/body>/giu)[0];

console.info(`Invoke webshop processor for ${roasterId} and url: ${url}`);

const result = await handler({ url, roasterId, html: deflateSync(html).toString('base64'), isTest: true });

console.log(result);
