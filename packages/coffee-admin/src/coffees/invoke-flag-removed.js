import { invokeLambda } from '../AWS.js';
import client from '../turso.js';

const invokeFlagRemoved = async () => {
  const results = await client.execute({
    sql: 'SELECT id, webshop_item_link, roaster_id FROM coffees WHERE NOT is_removed AND webshop_item_link IS NOT NULL'
  });

  for (const { id, webshop_item_link: webshopItemLink, roaster_id: roasterId } of results.rows) {
    console.info(`Invoking flag-removed for coffee with id ${id}, and link ${webshopItemLink}`);
    await invokeLambda({
      functionName: 'coffeeAdmin',
      payload: {
        function: 'coffees:flag-removed',
        details: { id, webshopItemLink, roasterId }
      }
    });
  }
};

export default invokeFlagRemoved;
