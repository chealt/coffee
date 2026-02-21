/* eslint-disable camelcase */
import { getClient } from './client.js';
import { getValue } from './formData.js';
import coffees from '../../../data/coffees.json';
import { convertToUSD } from '../../components/coffees/utils.js';
import logger from '../../components/errors/utils.js';
import { getImageUrl } from '../AWS/storage.js';

const queryCollections = async (user) => {
  const client = getClient(user.name);

  const results = await client.execute({
    sql: 'SELECT id, name, is_built_in FROM collections ORDER BY rank ASC'
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

const getPriceIndex = ({ details, pricePerGram }) => {
  const similarCoffeePrices = getSimilarCoffeePrices(details);

  if (similarCoffeePrices.length < 3) {
    return undefined;
  }

  const cheaperCount = similarCoffeePrices.filter((price) => price < pricePerGram).length;

  return cheaperCount / similarCoffeePrices.length;
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
            ?.map(({ filename }) => ({
              filename,
              src: getImageUrl({ filename }),
              srcSmall: getImageUrl({ filename, size: 'small' }),
              srcMedium: getImageUrl({ filename, size: 'medium' })
            })) || [];

        return {
          id: itemId,
          cover: images[0],
          images
        };
      })
  }));
};

const getExtractedDetails = async (collectionItemImages) =>
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
  const pricePerGram = calculatePricePerGram(details);

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
      pricePerGram,
      priceIndex: pricePerGram ? getPriceIndex({ details, pricePerGram }) : undefined
    },
    extractedDetails,
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

const updateRanks = async ({ user, items }) => {
  const client = getClient(user.name);

  const collections_batch_commands = items.map(({ rank, id }) => ({
    sql: 'UPDATE collections SET rank = :rank WHERE id = :id',
    args: { rank, id }
  }));

  return await client.batch(collections_batch_commands);
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
  updateCollectionName,
  updateRanks
};
