import { isAdmin } from '../../server/admin.js';
import { getSessionUser } from '../../server/authentication/session.js';
import { invoke } from '../../server/AWS/lambda.js';
import logger from '../../server/utils/logger.js';

/**
 * @type {import("astro").MiddlewareHandler}
 */
const POST = async (context) => {
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

  const formData = await context.request.formData();

  const roasterId = Number(formData.get('roasterId'));

  if (!roasterId || isNaN(roasterId)) {
    return new Response(JSON.stringify({ error: 'Missing roaster ID' }), {
      status: 403
    });
  }

  try {
    await invoke({ name: 'recordRoasterWebshop', payload: { roasterId } });
  } catch (error) {
    logger.error(error);

    return new Response(JSON.stringify({ error: 'Could not parse roaster' }), { status: 503 });
  }

  return new Response(JSON.stringify({ success: true }));
};

export { POST };
