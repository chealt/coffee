const collectionsKey = 'chealt-collections';
// eslint-disable-next-line complexity
const save = async ({ collectionID, collectionName, isBuiltIn, itemID, fileName }) => {
  const collectionsRaw = localStorage.getItem(collectionsKey);
  const collections = JSON.parse(collectionsRaw) || [];
  const collection = collections.find(({ id }) => id === collectionID);
  const item = collection?.items?.find(({ id }) => id === itemID);

  if (collectionName && collection) {
    collection.name = collectionName;
  }

  if (!collection) {
    if (itemID && fileName) {
      collections.push({
        id: collectionID,
        name: collectionName,
        isBuiltIn,
        items: [{ id: itemID, images: [{ fileName }] }]
      });
    } else {
      collections.push({ id: collectionID, name: collectionName, isBuiltIn });
    }
  } else {
    if (!collection.items) {
      collection.items = [{ id: itemID, images: [{ fileName }] }];
    } else if (!collection.items.some(({ id: existingItemID }) => existingItemID === itemID)) {
      collection.items.push({ id: itemID, images: [{ fileName }] });
    } else if (!item.images.some(({ fileName: existingFileName }) => existingFileName === fileName)) {
      item.images.push({ fileName });
    }
  }

  // make sure that copies get updated as well
  if (collection?.items) {
    collections
      .filter(
        ({ id, items: copyItems }) =>
          id !== collectionID && copyItems?.some(({ id: existingItemID }) => existingItemID === itemID)
      )
      .forEach((c) => {
        c.items = collection.items;
      });
  }

  localStorage.setItem(collectionsKey, JSON.stringify(collections));
};

const getAllCollections = () => {
  const collectionsRaw = localStorage.getItem(collectionsKey);
  const collections = JSON.parse(collectionsRaw) || [];

  return collections;
};

const getCollection = (collectionID) => {
  const collections = getAllCollections();

  return collections.find(({ id }) => id === collectionID);
};

const getCollectionItems = ({ collectionID, itemID }) => {
  const collections = getAllCollections();

  return collections.find(({ id }) => id === collectionID)?.items?.find(({ id }) => id === itemID);
};

const deleteCollection = (collectionID) => {
  const collections = getAllCollections();

  localStorage.setItem(collectionsKey, JSON.stringify(collections.filter(({ id }) => id !== collectionID)));
};

const deleteCollectionItem = ({ collectionID, itemID }) => {
  const collections = getAllCollections();

  const newCollections = collections.map((collection) => {
    collection.items = collection?.items?.filter(({ id }) =>
      !collectionID ? id !== itemID : collection.id !== collectionID || id !== itemID
    );

    if (collection?.items?.length === 0) {
      delete collection.items;
    }

    return collection;
  });

  localStorage.setItem(collectionsKey, JSON.stringify(newCollections));
};

const updateCollectionName = ({ collectionID, collectionName }) => {
  const collections = getAllCollections();
  const collection = collections.find(({ id }) => id === collectionID);

  collection.name = collectionName;

  localStorage.setItem(collectionsKey, JSON.stringify(collections));
};

export {
  deleteCollection,
  deleteCollectionItem,
  getAllCollections,
  getCollection,
  getCollectionItems,
  updateCollectionName,
  save
};
