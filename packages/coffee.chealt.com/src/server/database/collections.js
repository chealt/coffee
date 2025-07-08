/* eslint-disable camelcase */
import { getClient } from './client.js';
import { getImageUrl } from '../cloudflare/r2/storage.js';

const queryCollections = async (user) => {
  const client = getClient(user.name);

  const results = await client.execute({
    sql: 'SELECT id, name, is_built_in FROM collections'
  });

  return results.rows;
};

const queryCollectionItems = async (user) => {
  const client = getClient(user.name);

  const results = await client.execute({
    sql: 'SELECT id FROM collection_items'
  });

  return results.rows;
};

const queryCollectionItemImages = async (user) => {
  const client = getClient(user.name);

  const results = await client.execute({
    sql: 'SELECT filename, collection_item_id FROM collection_item_images'
  });

  return results.rows;
};

const queryCollectionItemLinks = async (user) => {
  const client = getClient(user.name);

  const results = await client.execute({
    sql: 'SELECT collection_item_id, collection_id FROM collection_item_links'
  });

  return results.rows;
};

const getCollections = async (user) => {
  const collections = await queryCollections(user);
  const collectionItems = await queryCollectionItems(user);
  const collectionItemLinks = await queryCollectionItemLinks(user);
  const collectionItemImages = await queryCollectionItemImages(user);

  return collections.map(({ id: collectionId, name, is_built_in: isBuiltIn }) => ({
    id: collectionId,
    name,
    isBuiltIn: Boolean(isBuiltIn),
    items:
      collectionItems
        .filter((item) =>
          collectionItemLinks.some((link) => link.collection_item_id === item.id && link.collection_id === collectionId)
        )
        ?.map(({ id: itemId }) => ({
          id: itemId,
          images:
            collectionItemImages
              .filter((image) => image.collection_item_id === itemId)
              ?.map(({ filename }) => ({ filename, src: getImageUrl({ username: user.name, filename }) })) || []
        })) || []
  }));
};

const saveCollections = async ({ user, collections }) => {
  const client = getClient(user.name);

  const collections_batch_commands = collections.map(({ id, name, isBuiltIn }) => ({
    sql: 'INSERT INTO collections (id, name, is_built_in) VALUES (:id, :name, :is_built_in) ON CONFLICT(id) DO UPDATE SET name = :name, is_built_in = :is_built_in',
    args: { id, name, is_built_in: isBuiltIn }
  }));
  const collection_items_batch_commands = collections
    .map(
      ({ items }) =>
        items?.map(({ id }) => ({
          sql: 'INSERT INTO collection_items (id) VALUES (:id) ON CONFLICT(id) DO NOTHING',
          args: { id }
        })) || []
    )
    .flat();
  const collection_item_links_batch_delete_commands = collections
    .map(
      ({ items }) =>
        items?.map(({ id: collectionItemId }) => ({
          sql: 'DELETE FROM collection_item_links WHERE collection_item_id = :collection_item_id',
          args: { collection_item_id: collectionItemId }
        })) || []
    )
    .flat();
  const collection_item_links_batch_commands = collections
    .map(
      ({ id: collectionId, items }) =>
        items?.map(({ id: collectionItemId }) => ({
          sql: 'INSERT INTO collection_item_links (collection_item_id, collection_id) VALUES (:collection_item_id, :collection_id)',
          args: { collection_item_id: collectionItemId, collection_id: collectionId }
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
  await client.batch(collection_item_links_batch_delete_commands, 'write');
  await client.batch(collection_item_links_batch_commands, 'write');
  await client.batch(collection_item_images_batch_commands, 'write');
};

const deleteCollection = async ({ user, id }) => {
  const client = getClient(user.name);

  await client.execute({
    sql: 'DELETE FROM collections WHERE id = :id',
    args: { id }
  });

  const { rows } = await client.execute({
    sql: 'SELECT ci.id FROM collection_items ci LEFT JOIN collection_item_links cil ON cil.collection_item_id = ci.id WHERE cil.id IS NULL'
  });
  const orphanedItemIDs = rows.map((row) => `'${row.id}'`);

  return await client.execute({
    sql: `DELETE FROM collection_items WHERE id IN (${orphanedItemIDs.join(',')})`
  });
};

const deleteCollectionItem = async ({ user, id }) => {
  const client = getClient(user.name);

  await client.execute({
    sql: 'DELETE FROM collection_item_links WHERE collection_item_id = :id',
    args: { id }
  });

  return await client.execute({
    sql: 'DELETE FROM collection_items WHERE id = :id',
    args: { id }
  });
};

const updateCollectionName = async ({ user, id, name }) => {
  const client = getClient(user.name);

  return await client.execute({
    sql: 'UPDATE collections SET name = :name WHERE id = :id',
    args: { id, name }
  });
};

export { deleteCollection, deleteCollectionItem, getCollections, updateCollectionName, saveCollections };
