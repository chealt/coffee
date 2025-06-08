const collectionsKey = 'chealt-collections';
const save = async ({ collectionID, isBuiltIn, itemID, fileName }) => {
  const collectionsRaw = localStorage.getItem(collectionsKey);
  const collections = JSON.parse(collectionsRaw) || [];
  const collection = collections.find(({ id }) => id === collectionID);
  const items = collection?.items?.find(({ id }) => id === itemID);

  if (!collection) {
    collections.push({ id: collectionID, isBuiltIn, items: [{ id: itemID, images: [{ fileName }] }] });
  } else {
    if (!collection.items) {
      collection.items = [{ id: itemID, images: [{ fileName }] }];
    } else if (!collection.items.some(({ id: existingItemID }) => existingItemID === itemID)) {
      collection.items.push({ id: itemID, images: [{ fileName }] });
    } else if (!items.images.some(({ fileName: existingFileName }) => existingFileName === fileName)) {
      items.images.push({ fileName });
    }
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

  return collections.find(({ id }) => id === collectionID).items?.find(({ id }) => id === itemID);
};

const deleteCollection = (collectionID) => {
  const collections = getAllCollections();

  localStorage.setItem(
    collectionsKey,
    JSON.stringify(collections.filter(({ id }) => id !== collectionID))
  );
};

const deleteCollectionItem = ({ itemID }) => {
  const collections = getAllCollections();

  const newCollections = collections.map((collection) => {
    collection.items = collection.items.filter(({ id }) => id !== itemID);

    if (collection.items.length === 0) {
      delete collection.items;
    }

    return collection;
  });

  localStorage.setItem(
    collectionsKey,
    JSON.stringify(newCollections)
  );
};

export { getAllCollections, getCollection, save, deleteCollection, getCollectionItems, deleteCollectionItem };
