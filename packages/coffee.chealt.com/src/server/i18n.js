import { getSessionUser } from '../server/authentication/session.js';

const translators = ['attilabartha', 'martyna'];
const getCanTranslate = async (context) => {
  let canTranslate = false;

  try {
    const { username } = await getSessionUser(context);

    canTranslate = translators.includes(username);
  } catch {
    // DO NOTHING
  }

  return canTranslate;
};

export { getCanTranslate };
