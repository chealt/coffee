import { getSessionUser } from '../../../server/authentication/session.js';
import { getAll } from '../../../server/database/i18n.js';
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

  const { locale } = await context.request.json();

  const translations = await getAll(locale);

  return new Response(JSON.stringify(translations));
};

export { POST };
