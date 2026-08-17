import { getClient } from './client.js';

const queryCoffeesWithImages = async () => {
  const client = getClient();

  const results = await client.execute({
    sql: 'SELECT *, (SELECT json_group_array(url) FROM coffee_images WHERE coffee_id = coffees.id) AS images FROM coffees WHERE NOT is_removed'
  });

  return results.rows?.map(({ images, ...rest }) => ({
    ...rest,
    images: images ? JSON.parse(images) : undefined
  }));
};

export { queryCoffeesWithImages };
