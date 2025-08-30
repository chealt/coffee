/* eslint-disable camelcase */
import { getClient } from './client.js';
import { getValue } from './formData.js';
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

const queryCollectionItemsByCollectionId = async (user, collectionId) => {
  const client = getClient(user.name);

  const results = await client.execute({
    sql: 'SELECT ci.id FROM collection_items ci JOIN collection_item_links cil ON cil.collection_item_id = ci.id WHERE cil.collection_id = :collectionId',
    args: { collectionId }
  });

  return results.rows;
};

const queryCollectionItem = async (user, itemId) => {
  const client = getClient(user.name);

  const results = await client.execute({
    sql: 'SELECT id FROM collection_items WHERE id = :itemId',
    args: { itemId }
  });

  return results.rows[0];
};

const queryCollectionItemImages = async (user, itemId) => {
  const client = getClient(user.name);

  if (itemId) {
    const results = await client.execute({
      sql: 'SELECT filename FROM collection_item_images WHERE collection_item_id = :itemId',
      args: { itemId }
    });

    return results.rows;
  }

  const results = await client.execute({
    sql: 'SELECT filename, collection_item_id FROM collection_item_images'
  });

  return results.rows;
};

const queryCollectionItemLinks = async (user, itemId) => {
  const client = getClient(user.name);

  if (itemId) {
    const results = await client.execute({
      sql: 'SELECT collection_item_id, collection_id FROM collection_item_links WHERE collection_item_id = :itemId',
      args: { itemId }
    });

    return results.rows;
  }

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
    items: collectionItems
      .filter((item) =>
        collectionItemLinks.some((link) => link.collection_item_id === item.id && link.collection_id === collectionId)
      )
      ?.map(({ id: itemId }) => {
        const images =
          collectionItemImages
            .filter((image) => image.collection_item_id === itemId)
            ?.map(({ filename }) => ({ filename, src: getImageUrl({ filename }) })) || [];

        return {
          id: itemId,
          cover: images[0],
          images
        };
      })
  }));
};

const getCollectionItem = async (user, itemId) => {
  const collectionItem = await queryCollectionItem(user, itemId);
  const collectionItemImages = await queryCollectionItemImages(user, itemId);
  const favoriteItems = await queryCollectionItemsByCollectionId(user, 'favorites');
  const details = await getValue({ user, key: `${itemId}.details` });
  const review = await getValue({ user, key: `${itemId}.review` });
  const collectionItemLinks = await queryCollectionItemLinks(user, itemId);

  return {
    id: collectionItem.id,
    isFavorite: favoriteItems.some(({ id }) => id === itemId),
    images: collectionItemImages?.map(({ filename }) => ({
      filename,
      src: getImageUrl({ username: user.name, filename })
    })),
    details,
    review,
    inCollections: collectionItemLinks.map((link) => link.collection_id)
  };
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

const deleteCollectionItem = async ({ user, collectionId, itemId }) => {
  const client = getClient(user.name);

  if (!collectionId) {
    return await client.execute({
      sql: 'DELETE FROM collection_items WHERE id = :itemId',
      args: { itemId }
    });
  }

  return await client.execute({
    sql: 'DELETE FROM collection_item_links WHERE collection_item_id = :itemId AND collection_id = :collectionId',
    args: { itemId, collectionId }
  });
};

const updateCollectionName = async ({ user, id, name }) => {
  const client = getClient(user.name);

  return await client.execute({
    sql: 'UPDATE collections SET name = :name WHERE id = :id',
    args: { id, name }
  });
};

const addCollection = async ({ user, id, name, isBuiltIn }) => {
  const client = getClient(user.name);

  return await client.execute({
    sql: 'INSERT INTO collections (id, name, is_built_in) VALUES (:id, :name, :isBuiltIn)',
    args: { id, name, isBuiltIn }
  });
};

const addCollectionItem = async ({ user, id, itemId, filename }) => {
  const client = getClient(user.name);

  await client.execute({
    sql: 'INSERT INTO collection_items (id) VALUES (:itemId)',
    args: { itemId }
  });

  await client.execute({
    sql: 'INSERT INTO collection_item_links (collection_id, collection_item_id) VALUES (:id, :itemId)',
    args: { id, itemId }
  });

  return await client.execute({
    sql: 'INSERT INTO collection_item_images (filename, collection_item_id) VALUES (:filename, :itemId) ON CONFLICT(filename, collection_item_id) DO NOTHING',
    args: { filename, itemId }
  });
};

const addItemToCollection = async ({ user, collectionId, itemId }) => {
  const client = getClient(user.name);

  return await client.execute({
    sql: 'INSERT INTO collection_item_links (collection_id, collection_item_id) VALUES (:collectionId, :itemId)',
    args: { collectionId, itemId }
  });
};

const addCollectionItems = async ({ user, id, items }) => {
  const client = getClient(user.name);

  const collection_items_batch_commands = items.map((item) => ({
    sql: 'INSERT INTO collection_items (id) VALUES (:id) ON CONFLICT(id) DO NOTHING',
    args: { id: item.id }
  }));

  await client.batch(collection_items_batch_commands);

  const collection_item_links_batch_commands = items.map((item) => ({
    sql: 'INSERT INTO collection_item_links (collection_id, collection_item_id) VALUES (:collectionID, :collectionItemID)',
    args: { collectionID: id, collectionItemID: item.id }
  }));

  await client.batch(collection_item_links_batch_commands);

  const collection_item_images_batch_commands = items
    .map((item) =>
      item.images.map((image) => ({
        sql: 'INSERT INTO collection_item_images (filename, collection_item_id) VALUES (:filename, :collectionItemID) ON CONFLICT(filename, collection_item_id) DO NOTHING',
        args: { filename: image.filename, collectionItemID: item.id }
      }))
    )
    .flat();

  return await client.batch(collection_item_images_batch_commands);
};

const addCollectionItemImages = async ({ user, itemId, filename }) => {
  const client = getClient(user.name);

  return await client.execute({
    sql: 'INSERT INTO collection_item_images (filename, collection_item_id) VALUES (:filename, :itemId)',
    args: { filename, itemId }
  });
};

export {
  addCollection,
  addCollectionItem,
  addCollectionItems,
  addCollectionItemImages,
  addItemToCollection,
  deleteCollection,
  deleteCollectionItem,
  getCollections,
  getCollectionItem,
  updateCollectionName
};
