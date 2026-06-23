import { invoke } from '../../../../server/AWS/lambda.js';
import { getSessionUser } from '../../../../server/authentication/session.js';
import { getUserByUsernameOrEmail, getUser } from '../../../../server/database/user.js';
import logger from '../../../../server/utils/logger.js';

const errorCodes = {
  userNotFound: 'USER_NOT_FOUND',
  rateLimit: 'RATE_LIMIT_EXCEEDED'
};

const sendCode = ({ username, email }) => invoke({ name: 'sendRegistrationCode', payload: { username, email } });

const checkRateLimit = async ({ context, email }) => {
  const { success } = await context.locals.runtime.env.REGISTRATION_CODE_RATE_LIMITER.limit({
    key: `send-new-registration-code-${email}`
  });

  if (!success) {
    return new Response(JSON.stringify({ errorCode: errorCodes.rateLimit }), { status: 429 });
  }
};

const GET = async (context) => {
  try {
    const user = await getSessionUser(context);

    const username = user.username;
    const email = (await getUser(username)).email;

    if (!username || !email) {
      return new Response(JSON.stringify({ errorCode: errorCodes.userNotFound }), { status: 401 });
    }

    await checkRateLimit({ context, email });

    await sendCode({ username, email });
  } catch (error) {
    logger.error(error);

    return new Response(JSON.stringify({ errorCode: errorCodes.userNotFound }), { status: 401 });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};

const POST = async (context) => {
  try {
    const requestJSON = await context.request.json();

    const user = await getUserByUsernameOrEmail(requestJSON.username);
    const email = user.email;
    const username = user.username;

    if (!username || !email) {
      return new Response(JSON.stringify({ errorCode: errorCodes.userNotFound }), { status: 401 });
    }

    await checkRateLimit({ context, email });

    await sendCode({ username, email });
  } catch (error) {
    logger.error(error);

    return new Response(JSON.stringify({ errorCode: errorCodes.userNotFound }), { status: 401 });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};

export { GET, POST };
