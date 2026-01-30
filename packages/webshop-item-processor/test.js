import { handler } from './src/index.js';
import { deflateSync } from 'node:zlib';

const urls = [
  'https://teso.coffee/kawa/abdo-limu/',
  'https://teso.coffee/kawa/banko-gotiti/',
  'https://teso.coffee/kawa/el-libano/',
  'https://teso.coffee/kawa/gaitania/',
  'https://teso.coffee/kawa/konga/',
  'https://teso.coffee/kawa/muranga/',
  'https://teso.coffee/kawa/rungeto-kii/',
  'https://teso.coffee/kawa/san-ignacio/',
  'https://teso.coffee/kawa/sertao-2/'
];
const roasterId = 291;

for (const url of urls) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch webshop page ${url}`);
  }

  const html = (await response.text()).match(/<body[^>]*>[\s\S]*<\/body>/giu)[0];

  console.info(`Invoke webshop processor for ${roasterId} and url: ${url}`);

  await handler({ url, roasterId, html: deflateSync(html).toString('base64') });
}
