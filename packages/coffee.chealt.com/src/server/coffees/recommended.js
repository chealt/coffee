import coffees from '../../../data/coffees.json';
import { getDetails } from '../../components/coffees/utils.js';
import { shuffle } from '../../utils/array.js';

const getRecommendedCoffees = ({ locale }) => {
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

export { getRecommendedCoffees };
