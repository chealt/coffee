import { invoke } from '../../../../server/AWS/lambda.js';
import { getSessionUser } from '../../../../server/authentication/session.js';
import { getUserByUsernameOrEmail, getUser } from '../../../../server/database/user.js';
import logger from '../../../../server/utils/logger.js';

const POST = async (context) => {
  const isProfile = context.request.url.includes('?profile');

  try {
    let email;
    let username;

    if (isProfile) {
      const user = getSessionUser(context);

      username = user.username;
      email = (await getUser(username)).email;
    } else {
      const requestJSON = await context.request.json();

      const user = await getUserByUsernameOrEmail(requestJSON.username);
      email = user.email;
      username = user.username;
    }

    if (!username || !email) {
      return new Response(JSON.stringify({ errorCode: 'USER_NOT_FOUND' }), { status: 401 });
    }

    const { success } = await context.env.REGISTRATION_CODE_RATE_LIMITER.limit({
      key: `send-new-registration-code-${email}`
    });

    if (!success) {
      return new Response(JSON.stringify({ errorCode: 'RATE_LIMIT_EXCEEDED' }), { status: 429 });
    }

    await invoke({ name: 'sendRegistrationCode', payload: { username, email } });
  } catch (error) {
    logger.error(error);

    return new Response(JSON.stringify({ errorCode: 'USER_NOT_FOUND' }), { status: 401 });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};

export { POST };
