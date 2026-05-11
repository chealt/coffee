import { getSessionUser } from '../server/authentication/session.js';

const translators = ['attilabartha', 'martyna'];
const getCanTranslate = (context) => {
  let canTranslate = false;

  try {
    const { username } = getSessionUser(context);

    canTranslate = translators.includes(username);
  } catch {
    // DO NOTHING
  }

  return canTranslate;
};

export { getCanTranslate };
