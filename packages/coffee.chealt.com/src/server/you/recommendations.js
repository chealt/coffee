import { getSessionUser } from '../authentication/session.js';
import { getRecommendedRoasterIds } from '../database/collections.js';

const setRecommended = async (context) => {
  const loggedInUser = getSessionUser(context.request);

  if (loggedInUser) {
    context.locals.recommended = {};

    const roasters = await getRecommendedRoasterIds({ name: loggedInUser.username });

    if (roasters) {
      context.locals.recommended.roasters = roasters;
    }
  }
};

export { setRecommended };
