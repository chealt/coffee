import { getSessionUser } from '../authentication/session.js';
import { getCollectionItem, getCollections } from '../database/collections.js';

const setCollections = async (context) => {
  const loggedInUser = getSessionUser(context.request);

  if (loggedInUser) {
    const collections = await getCollections({ name: loggedInUser.username });

    if (collections) {
      context.locals.collections = collections;
    }
  }
};

const setCollectionItem = async (context, itemId) => {
  const loggedInUser = getSessionUser(context.request);

  if (loggedInUser) {
    const collectionItem = await getCollectionItem({ name: loggedInUser.username }, itemId);

    if (collectionItem) {
      context.locals.collectionItem = collectionItem;
    }
  }
};

export { setCollections, setCollectionItem };
