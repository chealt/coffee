import brewingMethodGroups from '@data/brewingMethodGroups.json' with { type: 'json' };
import brewingMethods from '@data/brewingMethods.json' with { type: 'json' };
import coffeeImages from '@data/coffeeImages.json' with { type: 'json' };
import coffeeTasteNotes from '@data/coffeeTasteNotes.json' with { type: 'json' };
import coffeeVarieties from '@data/coffeeVarieties.json' with { type: 'json' };
import countries from '@data/countries.json' with { type: 'json' };
import exchangeRates from '@data/exchangeRates.json' with { type: 'json' };
import originCountries from '@data/originCountries.json' with { type: 'json' };
import originFarms from '@data/originFarms.json' with { type: 'json' };
import originRegions from '@data/originRegions.json' with { type: 'json' };
import processingMethods from '@data/processingMethods.json' with { type: 'json' };
import roasters from '@data/roasters.json' with { type: 'json' };
import roastingLevels from '@data/roastingLevels.json' with { type: 'json' };
import tasteNotes from '@data/tasteNotes.json' with { type: 'json' };
import varieties from '@data/varieties.json' with { type: 'json' };
import supportedLanguages from '@data/supportedLanguages.json' with { type: 'json' };

import logger from '../../server/utils/logger.js';

const defaultLocale = supportedLanguages.find(({ isDefault }) => isDefault)?.locale || 'en';
const getConvertedPrice = ({ currency, price }) => {
  const exchangeRate = exchangeRates.find(({ currency_code: code }) => code === currency).rate;

  if (!exchangeRate) {
    logger.error(new Error(`No exchange rate found for currency ${currency}`));

    return undefined;
  }

  return price * exchangeRate;
};

const convertToUSD = ({ currency, price }) => {
  const exchangeRate = exchangeRates.find(({ currency_code: code }) => code === currency).rate;

  if (!exchangeRate) {
    logger.error(new Error(`No exchange rate found for currency ${currency}`));

    return undefined;
  }

  return price / exchangeRate;
};

const getRoasterDetails = ({ id, locale }) => {
  const roaster = roasters.find(({ id: roasterId }) => roasterId === id);

  if (!roaster) {
    logger.error(new Error(`No roaster found for id ${id}`));

    return undefined;
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
    logger.error(new Error(`No brewing method found for id ${id}`));

    return undefined;
  }

  return {
    ...method,
    group: brewingMethodGroups.find((group) => group.id === method.brewing_method_group_id)
  };
};

const getTasteNote = ({ id, locale }) => {
  const tasteNote =
    tasteNotes.find(
      ({ taste_note_id, language_code: languageCode }) => id === taste_note_id && languageCode === locale
    ) ||
    tasteNotes.find(
      ({ taste_note_id, language_code: languageCode }) => id === taste_note_id && languageCode === defaultLocale
    );

  if (!tasteNote) {
    logger.error(`No taste note found for id ${id}`);

    return undefined;
  }

  return tasteNote;
};

const getCoffeeImages = (coffeeId) => {
  const images = coffeeImages.filter(({ coffee_id: id }) => id === coffeeId);

  if (!images.length) {
    logger.error(new Error(`No images found for coffee id ${coffeeId}`));

    return [];
  }

  return images.map((coffeeImage) => coffeeImage.url);
};

const getDetails =
  ({ locale }) =>
  (coffee) => ({
    id: coffee.id,
    brewingMethod: coffee.brewing_method_id ? getBrewingMethod({ id: coffee.brewing_method_id, locale }) : undefined,
    images: getCoffeeImages(coffee.id),
    tasteNotes: coffeeTasteNotes
      .filter(({ coffee_id: id }) => id === coffee.id)
      .map(({ taste_note_id: tasteNoteId }) => getTasteNote({ id: tasteNoteId, locale })),
    isDecaf: Boolean(coffee.is_decaf),
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
    pricePerGram: convertToUSD({ price: coffee.price_per_gram, currency: coffee.currency }),
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
    roastingDate: coffee.roasting_date,
    roastingLevel: roastingLevels.find(
      (roastingLevel) =>
        roastingLevel.roasting_level_id === coffee.roasting_level_id && roastingLevel.language_code === locale
    ),
    varieties: coffeeVarieties
      .filter(({ coffee_id: id }) => id === coffee.id)
      .map(({ variety_id: varietyId }) => varieties.find(({ id }) => id === varietyId)),
    webshopItem: Boolean(coffee.webshop_item),
    webshopItemLink: coffee.webshop_item_link,
    weight: coffee.weight
  });

export { getConvertedPrice, convertToUSD, getDetails };
