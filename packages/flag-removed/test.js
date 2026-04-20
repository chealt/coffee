import { handler } from './src/index.js';
import coffees from '../coffee.chealt.com/data/coffees.json' with { type: 'json' };

const roasterId = process.env.ROASTER_ID;

if (!roasterId || isNaN(Number(roasterId))) {
  throw new Error('No roaster id found, please provide a ROASTER_ID environment variable');
}

const items = coffees
  .filter(({ roaster_id }) => roaster_id === Number(roasterId))
  .map(({ id, webshop_item_link: webshopItemLink }) => ({
    id,
    webshopItemLink
  }));

for (const { id, webshopItemLink } of items) {
  await handler({ id, webshopItemLink, roasterId: Number(roasterId), isTest: true });
}
