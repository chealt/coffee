import brewingMethods from '../../../data/brewingMethods.json';
import coffeeImages from '../../../data/coffeeImages.json';
import coffeeTasteNotes from '../../../data/coffeeTasteNotes.json';
import exchangeRates from '../../../data/exchangeRates.json';
import originCountries from '../../../data/originCountries.json';
import originFarms from '../../../data/originFarms.json';
import originRegions from '../../../data/originRegions.json';
import roasters from '../../../data/roasters.json';
import roastingLevels from '../../../data/roastingLevels.json';
import tasteNotes from '../../../data/tasteNotes.json';

const getConvertedPricePerGram = ({ currency, pricePerGram }) => {
  const exchangeRate = exchangeRates.find(({ currency_code: code }) => code === currency).rate;

  if (!exchangeRate) {
    // eslint-disable-next-line no-console
    console.error(`No exchange rate found for currency ${currency}`);

    return undefined;
  }

  return pricePerGram / exchangeRate;
};

const getDetails =
  ({ locale }) =>
  (coffee) => ({
    id: coffee.id,
    brewingMethod: brewingMethods.find(
      (brewingMethod) =>
        brewingMethod.brewing_method_id === coffee.brewing_method_id && brewingMethod.language_code === locale
    ),
    currency: coffee.currency || 'PLN',
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
    price: coffee.price,
    pricePerGram: getConvertedPricePerGram({ currency: coffee.currency, pricePerGram: coffee.price_per_gram }),
    roaster: roasters.find((roaster) => roaster.id === coffee.roaster_id),
    roastingDate: coffee.roasting_date,
    roastingLevel: roastingLevels.find(
      (roastingLevel) =>
        roastingLevel.roasting_level_id === coffee.roasting_level_id && roastingLevel.language_code === locale
    ),
    webshopItemLink: coffee.webshop_item_link,
    weight: coffee.weight
  });

export { getConvertedPricePerGram, getDetails };
