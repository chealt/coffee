import { getSessionUser } from '../../../../server/authentication/session.js';
import { insert } from '../../../../server/database/formData.js';

const POST = async ({ params, request }) => {
  const loggedInUser = getSessionUser(request);

  if (!loggedInUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const user = { name: loggedInUser.username, id: loggedInUser.userID };

  if (!params.key) {
    return new Response(JSON.stringify({ error: 'Missing key!' }), { status: 400 });
  }

  const formData = await request.formData();
  const data = {};

  formData.forEach((value, key) => {
    if (key.endsWith('[]')) {
      // handle arrays
      if (!data[key]) {
        data[key] = [];
      }

      data[key].push(value);
    } else {
      data[key] = value;
    }
  });

  try {
    await insert({ user, key: params.key, value: data });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);

    return new Response(JSON.stringify({ error: 'Failed to insert data' }));
  }
};

export { POST };
