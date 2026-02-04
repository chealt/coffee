import { handler } from './src/index.js';
import { deflateSync } from 'node:zlib';

const urls = [
  'https://bemybean.pl/produkt/italo-disco-espresso/',
  'https://bemybean.pl/produkt/etiopia-gera-2/',
  'https://bemybean.pl/produkt/honduras-caviflor/',
  'https://bemybean.pl/produkt/brazylia-monte-carmelo/',
  'https://bemybean.pl/produkt/bold-bean/',
  'https://bemybean.pl/produkt/kolumbia-valle-del-cauca/',
  'https://bemybean.pl/produkt/decaf-espresso-kolumbia-popayan/',
  'https://bemybean.pl/produkt/heavy-bean/',
  'https://bemybean.pl/produkt/funky-bean-espresso/',
  'https://bemybean.pl/produkt/boogie-bean-espresso/',
  'https://bemybean.pl/produkt/happy-bean-sumatra/',
  'https://bemybean.pl/produkt/kostaryka-hacienda-sonora/',
  'https://bemybean.pl/produkt/kostaryka-corazon-de-jesus/',
  'https://bemybean.pl/produkt/rwanda-kiwu/',
  'https://bemybean.pl/produkt/kolumbia-el-recreo/',
  'https://bemybean.pl/produkt/kolumbia-alonso-bustos/',
  'https://bemybean.pl/produkt/etiopia-shakiso/',
  'https://bemybean.pl/produkt/kolumbia-las-garzas-2025/',
  'https://bemybean.pl/produkt/decaf-filter-kolumbia-popayan/'
];
const roasterId = 39;

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
