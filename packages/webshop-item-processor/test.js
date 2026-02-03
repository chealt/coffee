import { handler } from './src/index.js';
import { deflateSync } from 'node:zlib';

const urls = [
  'https://elcafetero.pl/etiopia/4-10-kawa-ziarnista-przelewowa-etiopia.html#/10-waga-200_g',
  'https://elcafetero.pl/buena-vista/3-8-kawa-ziarnista-espresso-buena-vista.html#/13-waga-250_g',
  'https://elcafetero.pl/brazylia/1-21-brazylia-chocolate-kawa-ziarnista-espresso.html#/13-waga-250_g',
  'https://elcafetero.pl/kawa-przelewowa/6-14-kawa-ziarnista-przelewowa-la-mixtura-filter.html#/13-waga-250_g',
  'https://elcafetero.pl/kawa-przelewowa/7-16-kawa-ziarnista-przelewowa-kenia.html#/10-waga-200_g',
  'https://elcafetero.pl/kawa-przelewowa/10-20-kawa-ziarnista-przelewowa-peru.html#/10-waga-200_g',
  'https://elcafetero.pl/kawa-przelewowa/17-24-gwatemala-la-maravilla-kawa-ziarnista-przelewowa.html#/13-waga-250_g',
  'https://elcafetero.pl/kawa-espresso/18-28-kostaryka-san-diego-kawa-ziarnista.html#/13-waga-250_g',
  'https://elcafetero.pl/kawa-przelewowa/19-29-gwatemala-la-maravilla-kawa-ziarnista-przelewowa.html#/13-waga-250_g',
  'https://elcafetero.pl/strona-glowna/20-30-peru-el-ronerillo-reserve-kawa-ziarnista-przelewowa.html#/10-waga-200_g',
  'https://elcafetero.pl/kawa-przelewowa/21-31-indonezja-frinsa-estate-kawa-ziarnista-przelewowa.html#/13-waga-250_g',
  'https://elcafetero.pl/strona-glowna/22-32-peru-el-ronerillo-reserve-kawa-ziarnista-przelewowa.html#/10-waga-200_g'
];
const roasterId = 7;

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
