import { handler } from './src/index.js';
import { handler as webshopProcessorHandler } from '../webshop-processor/src/index.js';
import { deflateSync } from 'node:zlib';
import roasters from '../coffee.chealt.com/data/roasters.json' with { type: 'json' };

const roasterId = process.env.ROASTER_ID;

if (!roasterId) {
  throw new Error('No roaster id found, please provide a ROASTER_ID environment variable');
}

const roaster = roasters.find(({ id }) => id === Number(roasterId));

if (!roaster?.webshop) {
  throw new Error(`No webshop url found for roaster id ${roasterId} (${roaster?.name})`);
}

const { webshop: webshopUrl, name: roasterName } = roaster;

const response = await fetch(webshopUrl);

if (!response.ok) {
  throw new Error(`Failed to fetch webshop page ${webshopUrl}`);
}

const html = (await response.text()).match(/<body[^>]*>[\s\S]*<\/body>/giu)[0];

console.info(`Invoke webshop processor for ${roasterId} (${roasterName}) and url: ${webshopUrl}`);

const urls = await webshopProcessorHandler({
  url: webshopUrl,
  roasterId,
  html: deflateSync(html).toString('base64'),
  isTest: true
});

for (const url of urls) {
  const itemResponse = await fetch(url);

  if (!itemResponse.ok) {
    throw new Error(`Failed to fetch webshop page ${url}`);
  }

  const itemHtml = (await itemResponse.text()).match(/<body[^>]*>[\s\S]*<\/body>/giu)[0];

  try {
    await handler({ url, roasterId, html: deflateSync(itemHtml).toString('base64'), isTest: true });
  } catch (error) {
    console.error(`Failed to process ${url}`, error);
  }
}
