import { getAuthenticationOptions } from '../../../../server/database/user.js';

const POST = async ({ request }) => {
  const { username } = await request.json();

  const options = await getAuthenticationOptions(username);

  return new Response(JSON.stringify({ options }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

export { POST };
