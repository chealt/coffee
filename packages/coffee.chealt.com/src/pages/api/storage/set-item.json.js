import { getSessionUser } from '../../../server/authentication/session.js';
import {
  addCollection,
  addCollectionItem,
  addCollectionItems,
  addCollectionItemImages,
  updateCollectionName,
  deleteCollectionItem,
  addItemToCollection
} from '../../../server/database/collections.js';

const POST = async (context) => {
  const loggedInUser = getSessionUser(context);

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
      case 'chealt-remove-item-from-collection':
        await deleteCollectionItem({ user, ...value });

        break;
      default:
        break;
    }
  } catch (error) {
    console.error(error); // eslint-disable-line no-console

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
