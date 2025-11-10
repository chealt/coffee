import brewingMethods from '../../../data/brewingMethods.json';
import coffeeImages from '../../../data/coffeeImages.json';
import coffeeTasteNotes from '../../../data/coffeeTasteNotes.json';
import coffeeVarieties from '../../../data/coffeeVarieties.json';
import countries from '../../../data/countries.json';
import exchangeRates from '../../../data/exchangeRates.json';
import originCountries from '../../../data/originCountries.json';
import originFarms from '../../../data/originFarms.json';
import originRegions from '../../../data/originRegions.json';
import processingMethods from '../../../data/processingMethods.json';
import roasters from '../../../data/roasters.json';
import roastingLevels from '../../../data/roastingLevels.json';
import tasteNotes from '../../../data/tasteNotes.json';
import varieties from '../../../data/varieties.json';
import logger from '../errors/utils.js';

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
    country: countries.find(
      ({ country_id: countryId, language_code: languageCode }) =>
        countryId === roaster.country_id && languageCode === locale
    )
  };
};

const getDetails =
  ({ locale }) =>
  (coffee) => ({
    id: coffee.id,
    brewingMethod: brewingMethods.find(
      (brewingMethod) =>
        brewingMethod.brewing_method_id === coffee.brewing_method_id && brewingMethod.language_code === locale
    ),
    images: coffeeImages.filter(({ coffee_id: id }) => id === coffee.id).map((coffeeImage) => coffeeImage.url),
    tasteNotes: coffeeTasteNotes
      .filter(({ coffee_id: id }) => id === coffee.id)
      .map(({ taste_note_id: tasteNoteId }) =>
        tasteNotes.find(
          ({ taste_note_id: id, language_code: languageCode }) => id === tasteNoteId && languageCode === locale
        )
      ),
    isDecaf: Boolean(coffee.is_decaf),
    originCountry: originCountries.find(
      (originCountry) =>
        originCountry.origin_country_id === coffee.origin_country_id && originCountry.language_code === locale
    ),
    originFarm: originFarms.find((originFarm) => originFarm.id === coffee.origin_farm_id),
    originRegion: originRegions.find(
      (originRegion) =>
        originRegion.origin_region_id === coffee.origin_region_id && originRegion.language_code === locale
    ),
    price: convertToUSD({ price: coffee.price, currency: coffee.currency || 'PLN' }),
    pricePerGram: convertToUSD({ price: coffee.price_per_gram, currency: coffee.currency }),
    processingMethod: processingMethods.find(
      ({ processing_method_id: id, language_code: languageCode }) =>
        coffee.processing_method_id === id && languageCode === locale
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
