import { getSessionUser } from '../../../server/authentication/session.js';
import { deleteCollection, deleteCollectionItem } from '../../../server/database/collections.js';

const DELETE = async ({ request }) => {
  const loggedInUser = getSessionUser(request);

  if (!loggedInUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { key, value } = await request.json();

  try {
    switch (key) {
      case 'collection':
        await deleteCollection({ user: { name: loggedInUser.username, id: loggedInUser.userID }, id: value });

        break;
      case 'chealt-collection-item':
        await deleteCollectionItem({
          user: { name: loggedInUser.username, id: loggedInUser.userID },
          collectionID: value.collectionID,
          itemID: value.itemID
        });

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

export { DELETE };
