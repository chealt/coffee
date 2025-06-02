const collectionsKey = 'chealt-collections';
const save = async ({ collectionID, name }) => {
  const collectionsRaw = localStorage.getItem(collectionsKey);
  const collections = JSON.parse(collectionsRaw) || {};

  collections[collectionID] = [...(collections[collectionID] || []), { name }];

  localStorage.setItem(collectionsKey, JSON.stringify(collections));
};

const getAllCollections = () => {
  const collectionsRaw = localStorage.getItem(collectionsKey);
  const collections = JSON.parse(collectionsRaw) || {};

  return collections;
};

const getCollection = (collectionID) => {
  const collections = getAllCollections();

  return collections[collectionID];
};

const deleteCollection = (collectionID) => {
  const collections = getAllCollections();

  delete collections[collectionID];

  localStorage.setItem(collectionsKey, JSON.stringify(collections));
};

export { getAllCollections, getCollection, save, deleteCollection };
