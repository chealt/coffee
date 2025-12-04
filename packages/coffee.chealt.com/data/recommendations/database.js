import { getDetails } from '../../src/components/coffees/utils.js';
import { getTasteNoteGroupByNoteId } from '../../src/components/taste-notes/utils.js';
import { shuffle } from '../../src/utils/array.js';
import coffees from '../coffees.json' with { type: 'json' };

const queryRecommendedRoasterIds = async (client) => {
  const results = await client.execute({
    sql: 'SELECT * FROM recommended_roaster_ids'
  });

  return results.rows;
};

const queryRecommendedOriginCountryIds = async (client) => {
  const results = await client.execute({
    sql: 'SELECT * FROM recommended_origin_country_ids'
  });

  return results.rows;
};

const queryRecommendedTasteNoteIds = async (client) => {
  const results = await client.execute({
    sql: 'SELECT * FROM recommended_taste_note_ids'
  });

  return results.rows;
};

const getRecommendedRoasterIds = async (client) => {
  const recommendedRoasterIds = await queryRecommendedRoasterIds(client);

  return recommendedRoasterIds?.map(({ roaster_id: roasterId }) => roasterId) || [];
};

const getRecommendedOriginCountryIds = async (client) => {
  const recommendedOriginCountryIds = await queryRecommendedOriginCountryIds(client);

  return (
    recommendedOriginCountryIds?.map(({ origin_country_id: originCountryId }) => originCountryId).slice(0, 2) || []
  );
};

const getRecommendedTasteNoteIds = async (client) => {
  const recommendedTasteNoteIds = await queryRecommendedTasteNoteIds(client);

  return Array.from(
    new Set(
      recommendedTasteNoteIds
        ?.map(({ taste_note_ids: ids }) => JSON.parse(ids))
        .flat()
        .map((id) => Number(id)) || []
    )
  );
};

const getRecommendedTasteNoteGroupIds = async (client) => {
  const recommendedTasteNoteIds = await getRecommendedTasteNoteIds(client);
  const recommendedTasteNoteGroupIds = recommendedTasteNoteIds
    ? Object.entries(
        recommendedTasteNoteIds
          .map((tasteNoteId) => getTasteNoteGroupByNoteId(tasteNoteId))
          .reduce((previousValue, currentValue) => {
            if (!previousValue[currentValue.taste_note_group_id]) {
              previousValue[currentValue.taste_note_group_id] = 1;
            } else {
              previousValue[currentValue.taste_note_group_id]++;
            }

            return previousValue;
          }, {})
      )
        .sort(([, valueA], [, valueB]) => valueB - valueA)
        .map(([tasteNoteGroupId]) => Number(tasteNoteGroupId))
        .slice(0, 1)
    : [];

  return recommendedTasteNoteGroupIds;
};

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

const getRecommendedCoffees = async ({ locale, client }) => {
  if (client) {
    const recommendedOriginCountryIds = await getRecommendedOriginCountryIds(client);
    const recommendedRoasterIds = await getRecommendedRoasterIds(client);
    const recommendedTasteNoteIds = await getRecommendedTasteNoteIds(client);

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

export {
  getRecommendedCoffees,
  getRecommendedOriginCountryIds,
  getRecommendedRoasterIds,
  getRecommendedTasteNoteGroupIds
};
