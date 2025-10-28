import { getSessionUser } from '../authentication/session.js';
import { getRecommendedCoffees } from '../coffees/recommended.js';
import { getRecommendedRoasterIds } from '../database/collections.js';

const setRecommended = async (context) => {
  let coffees;
  let roasters;

  context.locals.recommended = {};

  try {
    const loggedInUser = getSessionUser(context.request);

    if (loggedInUser) {
      coffees = await getRecommendedCoffees({ username: loggedInUser.username, locale: context.currentLocale });
      roasters = await getRecommendedRoasterIds({ name: loggedInUser.username });
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.info(error);

    coffees = await getRecommendedCoffees({ locale: context.currentLocale });
  }

  context.locals.recommended = {
    coffees,
    roasters
  };
};

export { setRecommended };
