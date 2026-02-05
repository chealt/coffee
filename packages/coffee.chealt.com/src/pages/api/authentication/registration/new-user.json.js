import { invoke } from '../../../../server/AWS/lambda.js';
import { getUserByUsernameOrEmail } from '../../../../server/database/user.js';
import logger from '../../../../server/utils/logger.js';

const POST = async (context) => {
  try {
    const formData = await context.request.formData();
    const email = formData.get('email');

    if (!email) {
      return new Response(JSON.stringify({ errorCode: 'EMAIL_REQUIRED' }), { status: 400 });
    }

    const { success } = await context.locals.runtime.env.NEW_USER_RATE_LIMITER.limit({
      key: `new-user-${email}`
    });

    if (!success) {
      return new Response(JSON.stringify({ errorCode: 'RATE_LIMIT_EXCEEDED' }), { status: 429 });
    }

    const user = await getUserByUsernameOrEmail(email);

    if (user) {
      return new Response(JSON.stringify({ errorCode: 'EMAIL_ALREADY_EXISTS' }), { status: 409 });
    }

    await invoke({ name: 'registerNewUser', payload: { email } });
  } catch (error) {
    logger.error(error);

    return new Response(JSON.stringify({ errorCode: 'FAILED_TO_REGISTER' }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};

export { POST };
