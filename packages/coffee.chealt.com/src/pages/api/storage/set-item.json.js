import { getSessionUser } from '../../../server/authentication/session.js';
import { saveCollections } from '../../../server/database/collections.js';

const POST = async ({ request }) => {
  const loggedInUser = getSessionUser(request);

  if (!loggedInUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { key, value: collections } = await request.json();

  try {
    switch (key) {
      case 'chealt-collections':
        await saveCollections({ user: { name: loggedInUser.username, id: loggedInUser.userID }, collections });

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
