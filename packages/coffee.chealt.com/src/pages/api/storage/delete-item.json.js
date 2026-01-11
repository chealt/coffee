import { getSessionUser } from '../../../server/authentication/session.js';
import { deleteCollection, deleteCollectionItem } from '../../../server/database/collections.js';
import logger from '../../../server/utils/logger.js';

const DELETE = async (context) => {
  const loggedInUser = getSessionUser(context);

  if (!loggedInUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { key, value } = await context.request.json();

  try {
    switch (key) {
      case 'collection':
        await deleteCollection({ user: { name: loggedInUser.username, id: loggedInUser.userID }, id: value });

        break;
      case 'chealt-collection-item':
        await deleteCollectionItem({
          user: { name: loggedInUser.username, id: loggedInUser.userID },
          itemId: value
        });

        break;
      default:
        break;
    }
  } catch (error) {
    logger.error(error);

    return new Response(
      JSON.stringify({ success: false, error: `Could not save changes to ${key}. Please try again!` }),
      {
        status: 500
      }
    );
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};

export { DELETE };
