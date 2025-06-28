import { getAuthenticationOptions } from '../../../../server/database/user.js';

const POST = async ({ request }) => {
  const { username } = await request.json();

  try {
    const options = await getAuthenticationOptions(username);

    return new Response(JSON.stringify({ options }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error(error); // eslint-disable-line no-console

    return new Response(JSON.stringify({ error: 'Cannot get authentication options. Please try again!' }));
  }
};

export { POST };
