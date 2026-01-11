import { invoke } from '../../../../server/AWS/lambda.js';
import { getSessionUser } from '../../../../server/authentication/session.js';
import { getUser } from '../../../../server/database/user.js';
import logger from '../../../../server/utils/logger.js';

const POST = async (context) => {
  try {
    const { username } = getSessionUser(context);
    const { email } = await getUser(username);

    await invoke({ name: 'coffeeAdmin', payload: { function: 'users:send-registration-code', username, email } });
  } catch (error) {
    logger.error(error);

    return new Response(null, { status: 401 });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};

export { POST };
