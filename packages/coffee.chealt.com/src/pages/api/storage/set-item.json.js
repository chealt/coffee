import { getSessionUser } from '../../../server/authentication/session.js';
import {
  addCollection,
  addCollectionItems,
  addCollectionItemImages,
  updateCollectionName,
  saveCollections
} from '../../../server/database/collections.js';

const POST = async ({ request }) => {
  const loggedInUser = getSessionUser(request);

  if (!loggedInUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { key, value } = await request.json();
  const user = { name: loggedInUser.username, id: loggedInUser.userID };

  try {
    switch (key) {
      case 'chealt-collections':
        await saveCollections({ user, collections: value });

        break;
      case 'chealt-collection-name':
        await updateCollectionName({ user, ...value });

        break;
      case 'chealt-collection-add':
        await addCollection({ user, ...value });

        break;
      case 'chealt-collection-add-with-item':
        await addCollection({ user, id: value.id, name: value.name, isBuiltIn: value.isBuiltIn });
        await addCollectionItems({ user, id: value.id, items: value.items });

        break;
      case 'chealt-collection-item-add':
        await addCollectionItems({ user, id: value.id, items: value.items });

        break;
      case 'chealt-collection-item-images-add':
        await addCollectionItemImages({ user, ...value });

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
