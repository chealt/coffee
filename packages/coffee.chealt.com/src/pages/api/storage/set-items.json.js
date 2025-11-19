import { getSessionUser } from '../../../server/authentication/session.js';
import { updateRanks } from '../../../server/database/collections.js';

const POST = async ({ request }) => {
  const loggedInUser = getSessionUser(request);

  if (!loggedInUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { key, value } = await request.json();
  const user = { name: loggedInUser.username, id: loggedInUser.userID };

  try {
    switch (key) {
      case 'chealt-collection-update-ranks':
        await updateRanks({ user, items: value });

        break;
      default:
        console.error(`Unknown key: ${key}`); // eslint-disable-line no-console

        return new Response(JSON.stringify({ error: 'Invalid command' }), { status: 400 });
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
