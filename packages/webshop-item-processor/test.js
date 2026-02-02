import { handler } from './src/index.js';
import { deflateSync } from 'node:zlib';

const urls = [
  'https://typika.coffee/collections/kava/products/christmas-special-filter-coffee-nicaragua-madrono-byron-rodriguez',
  'https://typika.coffee/collections/kava/products/baseline-coffee',
  'https://typika.coffee/collections/kava/products/colombia-santa-maria-exotico-filter-roast',
  'https://typika.coffee/collections/kava/products/colombia-santa-maria-el-dragon-decaf-omni-roast',
  'https://typika.coffee/collections/kava/products/kenya-sakami-gloria-espresso-roast',
  'https://typika.coffee/collections/kava/products/kenya-sakami-gloria-ab-espresso-roast',
  'https://typika.coffee/collections/kava/products/colombia-mama-sierra-espresso-roast',
  'https://typika.coffee/collections/kava/products/kenya-sakami-rosebella-amkeni-filter-roast',
  'https://typika.coffee/collections/kava/products/kenya-sakami-jane-aa-filter-roast-1',
  'https://typika.coffee/collections/kava/products/nicaragua-madrono-juan-ramon-diaz-filter-roast',
  'https://typika.coffee/collections/kava/products/nicaragua-madrono-gonzalo-chacalin-castillo-espresso-roast'
];
const roasterId = 14;

for (const url of urls) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch webshop page ${url}`);
  }

  const html = (await response.text()).match(/<body[^>]*>[\s\S]*<\/body>/giu)[0];

  try {
    await handler({ url, roasterId, html: deflateSync(html).toString('base64') });
  } catch (error) {
    console.error(`Failed to process ${url}`, error);
  }
}
