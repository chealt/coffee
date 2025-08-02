import { relyingPartyID } from '../../../../server/authentication/config.js';
import { getAuthenticationOptions } from '../../../../server/database/user.js';
import { getAuthenticationOptions as getNewAuthenticationOptions } from '../../../../server/login.js';

const POST = async ({ request }) => {
  const { username } = await request.json();

  try {
    let options = await getAuthenticationOptions(username);

    if (options.rpId !== relyingPartyID) {
      options = await getNewAuthenticationOptions(username);
    }

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
