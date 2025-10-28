import { getSessionUser } from '../authentication/session.js';
import { getRecommendedCoffees } from '../coffees/recommended.js';
import { getRecommendedRoasterIds } from '../database/collections.js';

const setRecommended = async (context) => {
  let coffees;
  let roasters;

  context.locals.recommended = {};

  try {
    const user = getSessionUser(context.request);

    if (user) {
      coffees = await getRecommendedCoffees({ user, locale: context.currentLocale });
      roasters = await getRecommendedRoasterIds({ name: user.username });
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
