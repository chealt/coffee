import { getSessionUser } from '../authentication/session.js';
import { getCollections } from '../database/collections.js';

const setCollections = async (context) => {
  const loggedInUser = getSessionUser(context.request);

  if (loggedInUser) {
    const collections = await getCollections({ name: loggedInUser.username });

    if (collections) {
      context.locals.collections = collections;
    }
  }
};

export { setCollections };
