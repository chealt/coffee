import { getSessionUser } from '../../../server/authentication/session.js';
import {
  addCollection,
  addCollectionItem,
  addCollectionItems,
  addCollectionItemImages,
  addItemToCollection,
  permanentlyDeleteCollectionItem,
  removeItemFromCollection,
  restoreCollectionItem,
  updateCollectionName,
  useCollectionItemImageAsCover
} from '../../../server/database/collections.js';
import logger from '../../../server/utils/logger.js';

const POST = async (context) => {
  const loggedInUser = await getSessionUser(context);

  if (!loggedInUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { key, value } = await context.request.json();
  const user = { name: loggedInUser.username, id: loggedInUser.userID };

  try {
    switch (key) {
      case 'chealt-collection-name':
        await updateCollectionName({ user, ...value });

        break;
      case 'chealt-add-collection':
        await addCollection({ user, id: value.id, name: value.name, isBuiltIn: false });

        break;
      case 'chealt-collection-add-with-item':
        await addCollection({ user, id: value.id, name: value.name, isBuiltIn: value.isBuiltIn });
        await addCollectionItems({ user, id: value.id, items: value.items });

        break;
      case 'chealt-add-item-to-collection':
        await addItemToCollection({ user, ...value });

        break;
      case 'chealt-add-image-to-collection':
        await addCollectionItem({ user, id: value.id, itemId: value.itemId, filename: value.filename });

        break;
      case 'chealt-add-image-to-collection-item':
        await addCollectionItemImages({ user, ...value });

        break;
      case 'chealt-permanently-delete-collection-item':
        await permanentlyDeleteCollectionItem({ user, itemId: value });

        break;
      case 'chealt-remove-item-from-collection':
        await removeItemFromCollection({ user, ...value });

        break;
      case 'chealt-restore-collection-item':
        await restoreCollectionItem({ user, itemId: value });

        break;
      case 'chealt-collection-item-image-use-as-cover':
        await useCollectionItemImageAsCover({ user, ...value });

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

export { POST };
