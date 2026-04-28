import { handler as webshopProcessorHandler } from '../webshop-processor/src/index.js';
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import roasters from '../coffee.chealt.com/data/roasters.json' with { type: 'json' };

const roasterId = process.env.ROASTER_ID;

if (!roasterId) {
  throw new Error('No roaster id found, please provide a ROASTER_ID environment variable');
}

const roaster = roasters.find(({ id }) => id === Number(roasterId));

if (!roaster?.webshop) {
  throw new Error(`No webshop url found for roaster id ${roasterId} (${roaster?.name})`);
}

const { webshop: webshopUrl } = roaster;

const dir = `./test-html/${roasterId}`;
mkdirSync(dir, { recursive: true });

const response = await fetch(webshopUrl);
const html = (await response.text()).match(/<body[^>]*>[\s\S]*<\/body>/giu)[0];
writeFileSync(`${dir}/webshop.html`, html);

const urls = await webshopProcessorHandler({
  url: webshopUrl,
  roasterId,
  html: deflateSync(html).toString('base64'),
  isTest: true
});

for (const url of urls) {
  const itemResponse = await fetch(url);
  const itemHtml = (await itemResponse.text()).match(/<body[^>]*>[\s\S]*<\/body>/giu)[0];
  const filename = url.split('#')[0].replace(/\/$/, '').split('/').pop().replace(/\.html?$/i, '').replace(/[^a-z0-9-]/g, '-');
  writeFileSync(`${dir}/${filename}.html`, itemHtml);
  console.info(`Saved ${filename}`);
}

console.info(`Saved ${urls.length} HTML files to ${dir}/`);
