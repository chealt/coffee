import { getUserByUsernameOrEmail, getUser } from '../../../../server/database/user.js';
import { getAuthenticationOptions } from '../../../../server/login.js';
import logger from '../../../../server/utils/logger.js';

const POST = async ({ request }) => {
  const { username } = await request.json();
  const userDefault = await getUserByUsernameOrEmail(username);

  if (!userDefault) {
    return new Response(JSON.stringify({ error: 'User not found', errorCode: 'USER_NOT_FOUND' }), { status: 404 });
  }

  const user = await getUser(userDefault.username);

  try {
    const options = await getAuthenticationOptions(user.name);

    return new Response(JSON.stringify({ options }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    logger.error(error);

    return new Response(
      JSON.stringify({
        error: 'Cannot get authentication options. Please try again!',
        errorCode: 'CANNOT_GET_AUTHENTICATION_OPTIONS'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export { POST };
