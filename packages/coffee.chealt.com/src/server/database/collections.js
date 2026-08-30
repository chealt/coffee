/* eslint-disable camelcase */
import { getClient } from './client.js';
import { getValue, updateAttributeValue } from './formData.js';
import coffees from '../../../data/coffees.json' with { type: 'json' };
import { convertToUSD } from '../../components/coffees/utils.js';
import logger from '../../components/errors/utils.js';
import { getImageUrl } from '../AWS/storage.js';
import { calculateDifference } from '@utils/time.js';

const queryCollections = async (user) => {
  const client = getClient(user.name);

  const results = await client.execute({
    sql: 'SELECT id, name, is_built_in FROM collections ORDER BY rank ASC'
  });

  return results.rows;
};

const queryCollectionItemsWithMainDetails = async (user) => {
  const client = getClient(user.name);

  const results = await client.execute({
    sql: 'SELECT ci.id AS id, ci.deleted_at, fd.value AS details FROM collection_items ci LEFT JOIN form_data fd ON fd.key = ci.id || ".details"'
  });

  return results.rows.map(({ id, deleted_at, details }) => ({
    id,
    deleted_at,
    details: details ? JSON.parse(details) : undefined
  }));
};

const queryImageDetails = async (filename) => {
  const client = getClient();

  const results = await client.execute({
    sql: 'SELECT details, status FROM collection_item_details WHERE filename = :filename',
    args: { filename }
  });

  return results.rows[0];
};

const queryCollectionItemsByCollectionId = async (user, collectionId) => {
  const client = getClient(user.name);

  const results = await client.execute({
    sql: 'SELECT ci.id FROM collection_items ci JOIN collection_item_links cil ON cil.collection_item_id = ci.id WHERE cil.collection_id = :collectionId ORDER BY ci.created_at DESC',
    args: { collectionId }
  });

  return results.rows;
};

const queryCollectionItem = async (user, itemId) => {
  const client = getClient(user.name);

  const results = await client.execute({
    sql: 'SELECT id FROM collection_items WHERE id = :itemId ORDER BY created_at DESC',
    args: { itemId }
  });

  return results.rows[0];
};

const queryCollectionItemImages = async (user, itemId) => {
  const client = getClient(user.name);

  if (itemId) {
    const results = await client.execute({
      sql: 'SELECT filename FROM collection_item_images WHERE collection_item_id = :itemId ORDER BY is_cover DESC, created_at ASC',
      args: { itemId }
    });

    return results.rows;
  }

  const results = await client.execute({
    sql: 'SELECT filename, collection_item_id FROM collection_item_images ORDER BY created_at ASC'
  });

  return results.rows;
};

const queryCollectionItemLinks = async (user, itemId) => {
  const client = getClient(user.name);

  if (itemId) {
    const results = await client.execute({
      sql: 'SELECT collection_item_id, collection_id FROM collection_item_links WHERE collection_item_id = :itemId AND deleted_at IS NULL ORDER BY created_at DESC',
      args: { itemId }
    });

    return results.rows;
  }

  const results = await client.execute({
    sql: 'SELECT collection_item_id, collection_id FROM collection_item_links ORDER BY created_at DESC'
  });

  return results.rows;
};

const getSimilarCoffeePrices = ({ originCountry, originRegion, originFarm, processingMethod, varieties }) =>
  coffees
    .filter(
      (
        {
          currency,
          price_per_gram: pricePerGram,
          origin_country_id: originCountryId,
          origin_region_id: originRegionId,
          origin_farm_id: originFarmId,
          processing_method_id: processingMethodId,
          varieties: coffeeVarieties
        } // eslint-disable-next-line complexity
      ) =>
        currency &&
        pricePerGram &&
        (originCountry && originCountryId ? Number(originCountry) === originCountryId : true) &&
        (originRegion && originRegionId ? Number(originRegion) === originRegionId : true) &&
        (originFarm && originFarmId ? Number(originFarm) === originFarmId : true) &&
        (processingMethod && processingMethodId ? Number(processingMethod) === processingMethodId : true) &&
        (varieties && varieties.length ? varieties.some((variety) => coffeeVarieties.includes(variety)) : true)
    )
    .map(({ currency, price_per_gram: pricePerGram }) => convertToUSD({ price: pricePerGram, currency }));

const calculateDaysSinceRoasting = ({ brewDate, roastingDate, frozenDate, defrostDate }) => {
  if (!roastingDate) {
    return;
  }

  if (!frozenDate) {
    return calculateDifference({ from: roastingDate, to: brewDate });
  }

  if (!defrostDate) {
    return calculateDifference({ from: roastingDate, to: frozenDate });
  }

  return (
    calculateDifference({ from: roastingDate, to: brewDate }) -
    calculateDifference({ from: frozenDate, to: defrostDate })
  );
};

/** @type {(items: { details?: { weight?: number } }[]) => number} */
const calculateCollectionWeight = (items) =>
  items.reduce(
    (totalWeight, item) => totalWeight + (!isNaN(Number(item.details?.weight)) ? Number(item.details?.weight) : 0),
    0
  );

const getCollections = async (user) => {
  const collections = await queryCollections(user);
  const collectionItems = await queryCollectionItemsWithMainDetails(user);
  const collectionItemLinks = await queryCollectionItemLinks(user);
  const collectionItemImages = await queryCollectionItemImages(user);

  return collections.map(({ id: collectionId, name, is_built_in: isBuiltIn }) => {
    const items = collectionItems
      .filter((item) =>
        collectionItemLinks.some((link) => link.collection_item_id === item.id && link.collection_id === collectionId)
      )
      ?.map(({ id: itemId, deleted_at: deletedAt, details }) => {
        const images =
          collectionItemImages
            .filter((image) => image.collection_item_id === itemId)
            ?.map(({ filename }) => ({
              filename,
              src: getImageUrl({ filename }),
              srcSmall: getImageUrl({ filename, size: 'small' }),
              srcMedium: getImageUrl({ filename, size: 'medium' })
            })) || [];
        const daysFrozen = details?.frozenDate
          ? calculateDifference({ from: details.frozenDate, to: details.defrostDate })
          : undefined;
        const isStillFrozen = Boolean(details?.frozenDate && !details?.defrostDate);
        const daysSinceRoasting = calculateDaysSinceRoasting(details || {}); // removing the frozen time

        return {
          id: itemId,
          cover: images[0],
          details: {
            daysFrozen,
            daysSinceRoasting,
            isStillFrozen,
            ...details
          },
          images,
          isDeleted: Boolean(deletedAt)
        };
      });
    const weight = calculateCollectionWeight(items);

    return {
      id: collectionId,
      name,
      isBuiltIn: Boolean(isBuiltIn),
      items,
      weight
    };
  });
};

const getExtractedDetails = (collectionItemImages) =>
  Promise.all(collectionItemImages.map(({ filename }) => queryImageDetails(filename))).then((results) =>
    results
      .filter((result) => Boolean(result))
      .map(({ details }) => JSON.parse(details))
      .reduce(
        // eslint-disable-next-line complexity
        (previousValue, currentValue) => ({
          brewingMethod: previousValue.brewingMethod || currentValue.brewingMethod,
          originCountry: previousValue.originCountry || currentValue.originCountry,
          originFarm: previousValue.originFarm || currentValue.originFarm,
          originRegion: previousValue.originRegion || currentValue.originRegion,
          processingMethod: previousValue.processingMethod || currentValue.processingMethod,
          roaster: previousValue.roaster || currentValue.roaster,
          'tasteNoteIds[]': (previousValue['tasteNoteIds[]'] || []).concat(currentValue['tasteNoteIds[]'] || []),
          'varieties[]': (previousValue['varieties[]'] || []).concat(currentValue['varieties[]'] || [])
        }),
        {}
      )
  );

const calculatePricePerGram = ({ price, weight, currency }) => {
  if (!price || !weight || !currency) {
    return undefined;
  }

  let parsedPrice = Number(price);

  if (isNaN(parsedPrice)) {
    logger.error(`Invalid price: ${price}`);

    parsedPrice = 0;
  }

  return parsedPrice ? convertToUSD({ currency, price: parsedPrice / weight }) : undefined;
};

const getCollectionItem = async (user, itemId) => {
  const collectionItem = await queryCollectionItem(user, itemId);
  const collectionItemImages = await queryCollectionItemImages(user, itemId);
  const extractedDetails = await getExtractedDetails(collectionItemImages);
  const favoriteItems = await queryCollectionItemsByCollectionId(user, 'favorites');
  const details = await getValue({ user, key: `${itemId}.details` });
  const review = await getValue({ user, key: `${itemId}.review` });
  const collectionItemLinks = await queryCollectionItemLinks(user, itemId);
  const pricePerGram = details ? calculatePricePerGram(details) : undefined;

  return {
    id: collectionItem.id,
    isFavorite: favoriteItems.some(({ id }) => id === itemId),
    images: collectionItemImages?.map(({ filename }) => ({
      filename,
      src: getImageUrl({ filename }),
      srcSmall: getImageUrl({ filename, size: 'small' }),
      srcMedium: getImageUrl({ filename, size: 'medium' }),
      status: queryImageDetails(filename)?.status
    })),
    details: {
      ...details,
      pricePerGram
    },
    extractedDetails,
    review,
    inCollections: collectionItemLinks.map((link) => link.collection_id)
  };
};

const deleteCollection = async ({ user, id }) => {
  const client = getClient(user.name);
  const now = new Date().toISOString();

  await client.execute({
    sql: 'UPDATE collections SET deleted_at = :now WHERE id = :id',
    args: { id, now }
  });

  const { rows } = await client.execute({
    sql: 'SELECT ci.id FROM collection_items ci LEFT JOIN collection_item_links cil ON cil.collection_item_id = ci.id WHERE cil.id IS NULL AND deleted_at IS NULL'
  });
  const orphanedItemIDs = rows.map((row) => `'${row.id}'`);

  return await client.execute({
    sql: `UPDATE collection_items SET deleted_at = :now WHERE id IN (${orphanedItemIDs.join(',')})`,
    args: { now }
  });
};

const removeItemFromCollection = async ({ user, collectionId, itemId }) => {
  const client = getClient(user.name);

  return await client.execute({
    sql: 'DELETE FROM collection_item_links WHERE collection_item_id = :itemId AND collection_id = :collectionId',
    args: { itemId, collectionId }
  });
};

const deleteCollectionItem = async ({ user, collectionId, itemId }) => {
  const client = getClient(user.name);
  const now = new Date().toISOString();

  if (!collectionId) {
    return await client.execute({
      sql: 'UPDATE collection_items SET deleted_at = :now WHERE id = :itemId',
      args: { itemId, now }
    });
  }

  return await client.execute({
    sql: 'UPDATE collection_item_links SET deleted_at = :now WHERE collection_item_id = :itemId AND collection_id = :collectionId',
    args: { itemId, collectionId, now }
  });
};

const deleteCollectionItemImage = async ({ user, filename }) => {
  const client = getClient(user.name);

  return await client.execute({
    sql: 'DELETE FROM collection_item_images WHERE filename = :filename',
    args: { filename }
  });
};

const permanentlyDeleteCollectionItem = async ({ user, collectionId, itemId }) => {
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

const deleteCollectionItems = async ({ user, items }) => {
  const client = getClient(user.name);
  const now = new Date().toISOString();

  return await client.batch(
    items.map((itemId) => ({
      sql: 'UPDATE collection_items SET deleted_at = :now WHERE id = :itemId',
      args: { itemId, now }
    }))
  );
};

const permanentlyDeleteCollectionItems = async ({ user, items }) => {
  const client = getClient(user.name);

  return await client.batch(
    items.map((itemId) => ({
      sql: 'DELETE FROM collection_items WHERE id = :itemId',
      args: { itemId }
    }))
  );
};

const restoreCollectionItem = async ({ user, itemId }) => {
  const client = getClient(user.name);

  return await client.execute({
    sql: 'UPDATE collection_items SET deleted_at = NULL WHERE id = :itemId',
    args: { itemId }
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
  const now = new Date().toISOString();

  return await client.execute({
    sql: 'INSERT INTO collections (id, name, is_built_in, created_at) VALUES (:id, :name, :isBuiltIn), :now',
    args: { id, name, isBuiltIn, now }
  });
};

const addCollectionItem = async ({ user, id, itemId, filename }) => {
  const client = getClient(user.name);
  const now = new Date().toISOString();

  await client.execute({
    sql: 'INSERT INTO collection_items (id, created_at) VALUES (:itemId, :now)',
    args: { itemId, now }
  });

  await client.execute({
    sql: 'INSERT INTO collection_item_links (collection_id, collection_item_id, created_at) VALUES (:id, :itemId, :now)',
    args: { id, itemId, now }
  });

  return await client.execute({
    sql: 'INSERT INTO collection_item_images (filename, collection_item_id, created_at) VALUES (:filename, :itemId, :now) ON CONFLICT(filename, collection_item_id) DO NOTHING',
    args: { filename, itemId, now }
  });
};

const addItemToCollection = async ({ user, collectionId, itemId }) => {
  const client = getClient(user.name);
  const now = new Date().toISOString();

  return await client.execute({
    sql: 'INSERT INTO collection_item_links (collection_id, collection_item_id, created_at) VALUES (:collectionId, :itemId, :now)',
    args: { collectionId, itemId, now }
  });
};

const addCollectionItems = async ({ user, id, items }) => {
  const client = getClient(user.name);
  const now = new Date().toISOString();

  const collection_items_batch_commands = items.map((item) => ({
    sql: 'INSERT INTO collection_items (id, created_at) VALUES (:id, :now) ON CONFLICT(id) DO NOTHING',
    args: { id: item.id, now }
  }));

  await client.batch(collection_items_batch_commands);

  const collection_item_links_batch_commands = items.map((item) => ({
    sql: 'INSERT INTO collection_item_links (collection_id, collection_item_id, created_at) VALUES (:collectionID, :collectionItemID, :now)',
    args: { collectionID: id, collectionItemID: item.id, now }
  }));

  await client.batch(collection_item_links_batch_commands);

  const collection_item_images_batch_commands = items
    .map((item) =>
      item.images.map((image) => ({
        sql: 'INSERT INTO collection_item_images (filename, collection_item_id, created_at) VALUES (:filename, :collectionItemID, :now) ON CONFLICT(filename, collection_item_id) DO NOTHING',
        args: { filename: image.filename, collectionItemID: item.id, now }
      }))
    )
    .flat();

  return await client.batch(collection_item_images_batch_commands);
};

const addCollectionItemImages = async ({ user, itemId, filename }) => {
  const client = getClient(user.name);
  const now = new Date().toISOString();

  return await client.execute({
    sql: 'INSERT INTO collection_item_images (filename, collection_item_id, created_at) VALUES (:filename, :itemId, :now)',
    args: { filename, itemId, now }
  });
};

const updateRanks = async ({ user, items }) => {
  const client = getClient(user.name);

  const collections_batch_commands = items.map(({ rank, id }) => ({
    sql: 'UPDATE collections SET rank = :rank WHERE id = :id',
    args: { rank, id }
  }));

  return await client.batch(collections_batch_commands);
};

const markAsBrewed = async ({ user, items }) => {
  for (const id of items) {
    await updateAttributeValue({
      user,
      key: `${id}.details`,
      attributes: {
        isBrewed: 'on',
        brewDate: new Date().toISOString().slice(0, 10)
      }
    });

    logger.info(`Updated details of item: ${id}`);
  }
};

const useCollectionItemImageAsCover = async ({ user, itemId, filename }) => {
  const client = getClient(user.name);

  await client.execute({
    sql: 'UPDATE collection_item_images SET is_cover = NULL WHERE collection_item_id = :itemId',
    args: { itemId }
  });

  return await client.execute({
    sql: 'UPDATE collection_item_images SET is_cover = TRUE WHERE filename = :filename AND collection_item_id = :itemId',
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
  deleteCollectionItemImage,
  deleteCollectionItems,
  getCollections,
  getCollectionItem,
  getSimilarCoffeePrices,
  markAsBrewed,
  permanentlyDeleteCollectionItem,
  permanentlyDeleteCollectionItems,
  removeItemFromCollection,
  restoreCollectionItem,
  updateCollectionName,
  updateRanks,
  useCollectionItemImageAsCover
};
