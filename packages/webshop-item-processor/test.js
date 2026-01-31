import { handler } from './src/index.js';
import { deflateSync } from 'node:zlib';

const urls = [
  'https://rgbcoffee.pl/products/burundi-nyagishiru-natural-filter-250g?variant=52741918228819',
  'https://rgbcoffee.pl/products/colombia-narino-decaf-omni-250g?variant=52353199374675',
  'https://rgbcoffee.pl/products/colombia-sidamo-wilder-lazo-anaerobic-washed-250g?variant=52741755568467',
  'https://rgbcoffee.pl/products/colombia-el-diviso-las-flores-anaerobic?variant=51580349088083',
  'https://rgbcoffee.pl/products/costa-rica-la-catarata-honey-250g?variant=52410423345491',
  'https://rgbcoffee.pl/products/espresso-special-burundi-nyagishiru-natural-250g?variant=52908670976339',
  'https://rgbcoffee.pl/products/espresso-special-honduras-el-jardin-anaerobic-250g?variant=52908987056467',
  'https://rgbcoffee.pl/products/kenya-kegwa-washed-250g?variant=51673796378963',
  'https://rgbcoffee.pl/products/honduras-el-jardin-anaerobic-filter-250g?variant=52741984485715',
  'https://rgbcoffee.pl/products/kenya-trans-nzoia-pb-washed-250g?variant=52410338246995'
];
const roasterId = 290;

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
