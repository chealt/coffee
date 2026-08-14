import { isAdmin } from '../../server/admin.js';
import { getSessionUser } from '../../server/authentication/session.js';
import { invoke } from '../../server/AWS/lambda.js';
import logger from '../../server/utils/logger.js';

/**
 * @type {import("astro").MiddlewareHandler}
 */
const GET = async (context) => {
  const loggedInUser = await getSessionUser(context);

  if (!loggedInUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  if (!isAdmin(loggedInUser.username)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      statusText: 'Unauthorized'
    });
  }

  try {
    await invoke({ name: 'triggerGithubAction' });
  } catch (error) {
    logger.error(error);

    return new Response(JSON.stringify({ error: 'Could run data export' }), { status: 503 });
  }

  return new Response(JSON.stringify({ success: true }));
};

export { GET };
