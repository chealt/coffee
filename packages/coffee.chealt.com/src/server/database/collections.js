/* eslint-disable camelcase */
import { getClient } from './client.js';

const saveCollections = async ({ user, collections }) => {
  const client = getClient(user.name);

  const collections_batch_commands = collections.map(({ id, name, isBuiltIn }) => ({
    sql: 'INSERT INTO collections (id, name, is_built_in) VALUES (:id, :name, :is_built_in) ON CONFLICT(id) DO UPDATE SET name = :name, is_built_in = :is_built_in',
    args: { id, name, is_built_in: isBuiltIn }
  }));
  const collection_items_batch_commands = collections
    .map(
      ({ id: collection_id, items }) =>
        items?.map(({ id }) => ({
          sql: 'INSERT INTO collection_items (id, collection_id) VALUES (:id, :collection_id) ON CONFLICT(id) DO UPDATE SET collection_id = :collection_id',
          args: { id, collection_id }
        })) || []
    )
    .flat();
  const collection_item_images_batch_commands = collections
    .map(
      ({ items }) =>
        items?.map(
          ({ id: collection_item_id, images }) =>
            images?.map(({ filename }) => ({
              sql: 'INSERT INTO collection_item_images (filename, collection_item_id) VALUES (:filename, :collection_item_id) ON CONFLICT(filename, collection_item_id) DO UPDATE SET collection_item_id = :collection_item_id',
              args: { filename: String(filename), collection_item_id }
            })) || []
        ) || []
    )
    .flat()
    .flat();

  await client.batch(collections_batch_commands, 'write');

  await client.batch(collection_items_batch_commands, 'write');

  await client.batch(collection_item_images_batch_commands, 'write');
};

const deleteCollection = async ({ user, id }) => {
  const client = getClient(user.name);

  return await client.execute({
    sql: 'DELETE FROM collections WHERE id = :id',
    args: { id }
  });
};

const deleteCollectionItem = async ({ user, id }) => {
  const client = getClient(user.name);

  return await client.execute({
    sql: 'DELETE FROM collection_items WHERE id = :id',
    args: { id }
  });
};

export { deleteCollection, deleteCollectionItem, saveCollections };
