import coffees from '@data/coffees.json' with { type: 'json' };

import { queryCoffeesWithImages } from '../database/coffees.js';

const setUnpublishedCoffees = async () => {
  const coffeesInDB = await queryCoffeesWithImages();
  const publishedCoffeeIDs = coffees.map(({ id }) => id);

  return coffeesInDB.filter(({ id }) => !publishedCoffeeIDs.includes(id));
};

export { setUnpublishedCoffees };
