/* eslint-disable complexity */
import { JSDOM } from 'jsdom';

/* eslint-disable import/no-unresolved */
import currencyCodes from './currencies.js';
import brewingMethods from '../data/brewingMethods.json' with { type: 'json' };
import originCountries from '../data/originCountries.json' with { type: 'json' };
import originFarms from '../data/originFarms.json' with { type: 'json' };
import originRegions from '../data/originRegions.json' with { type: 'json' };
import processingMethods from '../data/processingMethods.json' with { type: 'json' };
import roastingLevels from '../data/roastingLevels.json' with { type: 'json' };
import tasteNotes from '../data/tasteNotes.json' with { type: 'json' };
import varieties from '../data/varieties.json' with { type: 'json' };
/* eslint-enable import/no-unresolved */

const getDocument = (html) => {
  const {
    window: { document }
  } = new JSDOM(html);

  return document;
};

const parsers = {
  6: ({ html, url, roasterId }) => {
    console.info(`Parsing webshop item page ${url}`);

    const document = getDocument(html);

    console.info('Parsing webshop item page...');
    const price = parseFloat(
      document.querySelector('.price .woocommerce-Price-amount').textContent.replaceAll(' zł', '').replaceAll(',', '.')
    );

    const tasteNotesText = document.querySelector('.woocommerce-product-details__short-description')?.textContent;

    let tasteNotesStrings = [];

    if (tasteNotesText.includes(' — ')) {
      tasteNotesStrings = tasteNotesText.split(' — ');
    } else if (tasteNotesText.includes(' – ')) {
      tasteNotesStrings = tasteNotesText.split(' – ');
    } else if (tasteNotesText.includes(' - ')) {
      tasteNotesStrings = tasteNotesText.split(' - ');
    }

    const detailsTasteNotes = tasteNotesStrings.map((note) => note.toLowerCase().trim().replaceAll('\n', ''));

    const tasteNoteIds = Array.from(
      new Set(tasteNotes.filter(({ name }) => detailsTasteNotes.includes(name)).map(({ taste_note_id: id }) => id))
    );

    const currencySymbol = document.querySelector('.woocommerce-Price-currencySymbol').textContent;
    const currency = currencyCodes[currencySymbol];

    if (!currency) {
      throw new Error(`Unknown currency: ${currencySymbol}`);
    }

    const weight = Number(document.querySelector('.swatch_label').dataset.value.replaceAll('g-en', ''));

    const pricePerGram = Number((price / weight).toFixed(2));

    const originCountry = document.querySelector('[data-id="4cb216da"]').textContent.trim().toLowerCase();
    const originCountryId = originCountries.find(({ name }) => name === originCountry)?.origin_country_id || null;

    const brewingMethod = document.querySelector('[data-id="4af2f61c"]').textContent.trim().toLowerCase();
    const brewingMethodId =
      brewingMethods.find(
        ({ name }) => name === brewingMethod || (brewingMethod === 'espresso / pour over' && name === 'omni')
      )?.brewing_method_id || null;

    const regionOrFarm = document.querySelector('[data-id="15362af"]').textContent.trim().toLowerCase();

    const originRegionId = originRegions.find(({ name }) => regionOrFarm.includes(name))?.origin_region_id || null;
    const originFarmId = originFarms.find(({ name }) => regionOrFarm.includes(name))?.id || null;

    const processingMethod = document.querySelector('[data-id="16e90837"]').textContent.trim().toLowerCase();
    const processingMethodId =
      processingMethods.find(({ name }) => name === processingMethod)?.processing_method_id ||
      processingMethods.find(({ name }) => processingMethod.includes(name))?.processing_method_id ||
      null;

    const varietiesString = document.querySelector('[data-id="512fea5c"]').textContent.trim().toLowerCase();
    const varietiesStrings = varietiesString.includes(' / ') ? varietiesString.split(' / ') : [varietiesString];
    const varietyIds = varieties
      .filter(
        ({ name }) =>
          varietiesStrings.includes(name.toLowerCase()) ||
          (name.toLowerCase() === 'cuscatleco' && varietiesStrings.includes('cuzcatleco')) // typo
      )
      .map(({ id }) => id);

    if (!varietyIds.length) {
      console.info(`Missing varieties: ${varietiesStrings}`);
    }

    const image = document.querySelector('.woocommerce-product-gallery__wrapper img').src;

    return {
      brewingMethodId,
      currency,
      image,
      originCountryId,
      originFarmId,
      originRegionId,
      price,
      pricePerGram,
      processingMethodId,
      roasterId,
      tasteNoteIds,
      varietyIds,
      webshopItemLink: url,
      weight
    };
  }
};

export default parsers;
