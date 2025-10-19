import { cookieNameLocale } from '../../../../server/authentication/config.js';
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
    let redirectUrl;
    let headers;

    await insert({ user, key: params.key, value: data });

    if (params.key === 'settings') {
      redirectUrl = `/${data.language}/you/profile`;
      headers = [
        [
          'Set-Cookie',
          `${cookieNameLocale}=${data.language}; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=${60 * 60 * 24 * 365}`
        ]
      ];
    }

    return new Response(JSON.stringify({ success: true, redirectUrl }), { status: 200, headers });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);

    return new Response(JSON.stringify({ error: 'Failed to insert data' }));
  }
};

export { POST };
