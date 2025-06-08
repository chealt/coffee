const collectionsKey = 'chealt-collections';
const save = async ({ collectionID, isBuiltIn, itemID, fileName }) => {
  const collectionsRaw = localStorage.getItem(collectionsKey);
  const collections = JSON.parse(collectionsRaw) || [];
  const collection = collections.find(({ id }) => id === collectionID);
  const items = collection?.items?.find(({ id }) => id === itemID);

  if (!collection) {
    collections.push({ id: collectionID, isBuiltIn, items: [{ id: itemID, images: [{ fileName }] }] });
  } else {
    if (!items) {
      collection.items = [{ id: itemID, images: [{ fileName }] }];
    } else {
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

  return collections.find(({ id }) => id === collectionID).items.find(({ id }) => id === itemID);
};

const deleteCollection = (collectionID) => {
  const collections = getAllCollections();

  localStorage.setItem(
    collectionsKey,
    JSON.stringify(collections.filter(({ id }) => id !== collectionID))
  );
};

const deleteCollectionItem = ({ collectionID, itemID }) => {
  const collections = getAllCollections();
  const collection = collections.find(({ id }) => id === collectionID);

  collection.items = collection.items.filter(({ id }) => id !== itemID);

  if (collection.items.length === 0) {
    delete collection.items;
  }

  localStorage.setItem(
    collectionsKey,
    JSON.stringify(collections)
  );
};

export { getAllCollections, getCollection, save, deleteCollection, getCollectionItems, deleteCollectionItem };
