/* eslint-disable import/no-unresolved */
import brewingMethodGroups from '../../data/brewingMethodGroups.json' with { type: 'json' };
import brewingMethods from '../../data/brewingMethods.json' with { type: 'json' };
import coffeeImages from '../../data/coffeeImages.json' with { type: 'json' };
import coffeeTasteNotes from '../../data/coffeeTasteNotes.json' with { type: 'json' };
import coffeeVarieties from '../../data/coffeeVarieties.json' with { type: 'json' };
import countries from '../../data/countries.json' with { type: 'json' };
import exchangeRates from '../../data/exchangeRates.json' with { type: 'json' };
import originCountries from '../../data/originCountries.json' with { type: 'json' };
import originFarms from '../../data/originFarms.json' with { type: 'json' };
import originRegions from '../../data/originRegions.json' with { type: 'json' };
import processingMethods from '../../data/processingMethods.json' with { type: 'json' };
import roasters from '../../data/roasters.json' with { type: 'json' };
import tasteNotes from '../../data/tasteNotes.json' with { type: 'json' };
import varieties from '../../data/varieties.json' with { type: 'json' };
import supportedLanguages from '../../data/supportedLanguages.json' with { type: 'json' };
/* eslint-enable import/no-unresolved */

const defaultLocale = supportedLanguages.find(({ isDefault }) => isDefault)?.locale || 'en';
const getRoasterDetails = ({ id, locale }) => {
  const roaster = roasters.find(({ id: roasterId }) => roasterId === id);

  if (!roaster) {
    throw new Error(`No roaster found for id ${id}`);
  }

  return {
    ...roaster,
    country:
      countries.find(
        ({ country_id: countryId, language_code: languageCode }) =>
          countryId === roaster.country_id && languageCode === locale
      ) ||
      countries.find(
        ({ country_id: countryId, language_code: languageCode }) =>
          countryId === roaster.country_id && languageCode === defaultLocale
      )
  };
};

const getBrewingMethod = ({ id, locale }) => {
  const method =
    brewingMethods.find(
      ({ brewing_method_id: brewingMethodId, language_code: languageCode }) =>
        brewingMethodId === id && languageCode === locale
    ) ||
    brewingMethods.find(
      ({ brewing_method_id: brewingMethodId, language_code: languageCode }) =>
        brewingMethodId === id && languageCode === defaultLocale
    );

  if (!method) {
    throw new Error(`No brewing method found for id ${id}`);
  }

  return {
    ...method,
    group: brewingMethodGroups.find((group) => group.id === method.brewing_method_group_id)
  };
};

const convertToUSD = ({ currency, price }) => {
  const exchangeRate = exchangeRates.find(({ currency_code: code }) => code === currency).rate;

  if (!exchangeRate) {
    throw new Error(`No exchange rate found for currency ${currency}`);
  }

  return price / exchangeRate;
};

const getDetails =
  ({ locale }) =>
  (coffee) => ({
    brewingMethod: coffee.brewing_method_id ? getBrewingMethod({ id: coffee.brewing_method_id, locale }) : undefined,
    images: coffeeImages.filter(({ coffee_id: id }) => id === coffee.id).map((coffeeImage) => coffeeImage.url),
    originCountry:
      originCountries.find(
        (originCountry) =>
          originCountry.origin_country_id === coffee.origin_country_id && originCountry.language_code === locale
      ) ||
      originCountries.find(
        (originCountry) =>
          originCountry.origin_country_id === coffee.origin_country_id && originCountry.language_code === defaultLocale
      ),
    originFarm: originFarms.find((originFarm) => originFarm.id === coffee.origin_farm_id),
    originRegion:
      originRegions.find(
        (originRegion) =>
          originRegion.origin_region_id === coffee.origin_region_id && originRegion.language_code === locale
      ) ||
      originRegions.find(
        (originRegion) =>
          originRegion.origin_region_id === coffee.origin_region_id && originRegion.language_code === defaultLocale
      ),
    price: convertToUSD({ price: coffee.price, currency: coffee.currency || 'PLN' }),
    processingMethod:
      processingMethods.find(
        ({ processing_method_id: id, language_code: languageCode }) =>
          coffee.processing_method_id === id && languageCode === locale
      ) ||
      processingMethods.find(
        ({ processing_method_id: id, language_code: languageCode }) =>
          coffee.processing_method_id === id && languageCode === defaultLocale
      ),
    roaster: getRoasterDetails({ id: coffee.roaster_id, locale }),
    tasteNotes: coffeeTasteNotes
      .filter(({ coffee_id: id }) => id === coffee.id)
      .map(
        ({ taste_note_id: tasteNoteId }) =>
          tasteNotes.find(
            ({ taste_note_id: id, language_code: languageCode }) => id === tasteNoteId && languageCode === locale
          ) ||
          tasteNotes.find(
            ({ taste_note_id: id, language_code: languageCode }) => id === tasteNoteId && languageCode === defaultLocale
          )
      ),
    varieties: coffeeVarieties
      .filter(({ coffee_id: id }) => id === coffee.id)
      .map(({ variety_id: varietyId }) => varieties.find(({ id }) => id === varietyId)),
    webshopItemLink: coffee.webshop_item_link
  });

export { getDetails };
