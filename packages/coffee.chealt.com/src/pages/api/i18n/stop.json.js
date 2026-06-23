import { getSessionUser } from '../../../server/authentication/session.js';
import { getCanTranslate } from '../../../server/i18n.js';
import { getValue, insert } from '../../../server/database/formData.js';

const GET = async (context) => {
  const loggedInUser = await getSessionUser(context);

  if (!loggedInUser) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const canTranslate = await getCanTranslate(context);

  if (!canTranslate) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const user = { name: loggedInUser.username, id: loggedInUser.userID };

  const settings = await getValue({ user, key: 'settings' });

  await insert({
    user,
    key: 'settings',
    value: {
      ...settings,
      isTranslating: false
    }
  });

  return new Response(JSON.stringify({}));
};

export { GET };
