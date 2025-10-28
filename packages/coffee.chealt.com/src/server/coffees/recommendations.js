import coffees from '../../../data/coffees.json';
import { getDetails } from '../../components/coffees/utils.js';
import { shuffle } from '../../utils/array.js';
import {
  getRecommendedOriginCountryIds,
  getRecommendedRoasterIds,
  getRecommendedTasteNoteIds
} from '../database/collections.js';

const getRecommendedCoffeesAnonymous = ({ locale }) => {
  // get the priciest and cheapest coffee from every roaster
  const recommendations = coffees
    .map(getDetails({ locale }))
    .sort((a, b) => b.pricePerGram - a.pricePerGram)
    .reduce((previousValue, currentValue) => {
      if (!previousValue[currentValue.roaster.id]) {
        const currentRoasterCoffees = coffees.filter(
          ({ roaster_id: roasterId }) => roasterId === currentValue.roaster.id
        );

        if (currentRoasterCoffees.length >= 8) {
          previousValue[currentValue.roaster.id] = [currentRoasterCoffees[0], currentRoasterCoffees.pop()];
        }
      }

      return previousValue;
    }, {});

  const recommendedCoffees = shuffle(Object.values(recommendations).flat());

  return recommendedCoffees;
};

const getRecommendedCoffees = async ({ locale, user }) => {
  if (user) {
    const recommendedOriginCountryIds = await getRecommendedOriginCountryIds(user);
    const recommendedRoasterIds = await getRecommendedRoasterIds(user);
    const recommendedTasteNoteIds = await getRecommendedTasteNoteIds(user);

    const recommendedCoffees = shuffle(
      coffees
        .map(getDetails({ locale }))
        .filter(
          ({ originCountry: { origin_country_id: originCountryId }, roaster: { id: roasterId }, tasteNotes }) =>
            recommendedOriginCountryIds.includes(originCountryId) ||
            recommendedRoasterIds.includes(roasterId) ||
            tasteNotes.some(({ taste_note_id: tasteNoteId }) => recommendedTasteNoteIds.includes(tasteNoteId))
        )
    )
      .slice(0, 10)
      .map(({ id }) => coffees.find((coffee) => id === coffee.id));

    return recommendedCoffees;
  }

  return getRecommendedCoffeesAnonymous({ locale });
};

export { getRecommendedCoffees };
