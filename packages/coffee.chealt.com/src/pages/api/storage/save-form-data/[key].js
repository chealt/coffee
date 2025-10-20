import { getSessionUser } from '../../../../server/authentication/session.js';
import { cookieNameCurrency, cookieNameLocale } from '../../../../server/config.js';
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
    const headers = [];

    await insert({ user, key: params.key, value: data });

    if (params.key === 'settings' && data.language) {
      redirectUrl = `/${data.language}/you/profile`;
      headers.push([
        'Set-Cookie',
        `${cookieNameLocale}=${data.language}; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=${60 * 60 * 24 * 365}`
      ]);
    }

    if (params.key === 'settings' && data.currency) {
      headers.push([
        'Set-Cookie',
        `${cookieNameCurrency}=${data.currency}; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=${60 * 60 * 24 * 365}`
      ]);
    }

    return new Response(JSON.stringify({ success: true, redirectUrl }), { status: 200, headers });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(error);

    return new Response(JSON.stringify({ error: 'Failed to insert data' }));
  }
};

export { POST };
