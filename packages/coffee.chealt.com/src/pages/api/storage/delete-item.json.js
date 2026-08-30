import { getSessionUser } from '../../../server/authentication/session.js';
import {
  deleteCollection,
  deleteCollectionItem,
  deleteCollectionItemImage
} from '../../../server/database/collections.js';
import { deletePasskey } from '../../../server/database/user.js';
import logger from '../../../server/utils/logger.js';

const DELETE = async (context) => {
  const loggedInUser = await getSessionUser(context);

  if (!loggedInUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { key, value } = await context.request.json();
  const user = { name: loggedInUser.username, if: loggedInUser.userID };

  try {
    switch (key) {
      case 'collection':
        await deleteCollection({ user, id: value });

        break;
      case 'chealt-collection-item':
        await deleteCollectionItem({
          user,
          itemId: value
        });

        break;
      case 'collection-item-image':
        await deleteCollectionItemImage({ user, filename: value });

        break;
      case 'passkey':
        await deletePasskey({
          user,
          credentialId: value
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
