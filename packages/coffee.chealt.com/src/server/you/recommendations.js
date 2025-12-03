import { getSessionUser } from '../authentication/session.js';
import { getRecommendedCoffees } from '../coffees/recommendations.js';
import {
  getRecommendedOriginCountryIds,
  getRecommendedRoasterIds,
  getRecommendedTasteNoteGroupIds
} from '../database/collections.js';

const setRecommended = async (context) => {
  let coffees;
  let originCountries;
  let roasters;
  let tasteNoteGroups;

  context.locals.recommended = {};

  try {
    const user = getSessionUser(context);

    if (user) {
      coffees = await getRecommendedCoffees({ user: { name: user.username }, locale: context.currentLocale });
      originCountries = await getRecommendedOriginCountryIds({ name: user.username });
      roasters = await getRecommendedRoasterIds({ name: user.username });
      tasteNoteGroups = await getRecommendedTasteNoteGroupIds({ name: user.username });
    }
  } catch (error) {
    console.info(error);

    coffees = await getRecommendedCoffees({ locale: context.currentLocale });
  }

  context.locals.recommended = {
    coffees,
    originCountries,
    roasters,
    tasteNoteGroups
  };
};

export { setRecommended };
