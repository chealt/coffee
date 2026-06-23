import { getSessionUser } from '../../../server/authentication/session.js';
import { save } from '../../../server/database/i18n.js';
import { getCanTranslate } from '../../../server/i18n.js';

const POST = async (context) => {
  const loggedInUser = await getSessionUser(context);

  if (!loggedInUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const canTranslate = await getCanTranslate(context);

  if (!canTranslate) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { namespace, key, locale, value } = await context.request.json();

  await save({ namespace, key, locale, value });

  return new Response(null);
};

export { POST };
