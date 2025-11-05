/* eslint-disable complexity */
import { JSDOM } from 'jsdom';

import { translate } from './AWS.js';
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
  // Sheep & Raven
  6: ({ html, url, roasterId }) => {
    console.info(`Parsing webshop item page ${url}`);

    const document = getDocument(html);

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

    const weightElement = document.querySelector('.swatch_label');

    if (!weightElement?.dataset?.value) {
      throw new Error(`Missing weight for ${url}`);
    }

    const weight = Number(weightElement.dataset.value.replaceAll('g-en', ''));

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
  },
  // El Cafetero
  7: ({ html, url, roasterId }) => {
    console.info(`Parsing webshop item page: ${url}`);

    const document = getDocument(html);

    const price = parseFloat(document.querySelector('.current-price-value').textContent.trim().replaceAll(' PLN', ''));

    const currency = 'PLN';

    const weight = Number(
      document.querySelector('select[name="group[8]"] option[selected]').textContent.replace(' g', '')
    );

    if (isNaN(weight)) {
      throw new Error(`Invalid weight: ${weight}`);
    }

    const pricePerGram = Number((price / weight).toFixed(2));

    const details = Array.from(document.querySelectorAll('.data-sheet dt')).reduce((newDetails, nameElement) => {
      const name = nameElement.textContent.toLowerCase();
      const value = nameElement.nextElementSibling.textContent.toLowerCase();

      return { ...newDetails, [name]: value };
    }, {});

    if (details['skład']?.includes('robusta')) {
      console.info(`Skipping robusta: ${url}`);

      return {};
    }

    const originCountry = details.pochodzenie;
    const originCountryId = originCountries.find(({ name }) => name === originCountry)?.origin_country_id || null;

    if (!originCountryId) {
      throw new Error(`Missing origin country: ${originCountry}`);
    }

    const originRegion = details.region;
    const originRegionId = originRegions.find(({ name }) => name === originRegion)?.origin_region_id || null;

    if (!originRegionId) {
      console.info(`Missing origin region: ${originCountry} - ${originRegion}`);
    }

    const brewingMethod = details['profil palenia'];
    const brewingMethodId = brewingMethods.find(({ name }) => name === brewingMethod)?.brewing_method_id || null;

    if (!brewingMethodId) {
      console.info(`Missing brewing method: ${brewingMethod}`);
    }

    const processingMethod = details['obróbka'];
    const processingMethodId =
      processingMethods.find(
        ({ name }) => name === processingMethod || (name === 'washed' && processingMethod === 'myta')
      )?.processing_method_id || null;

    if (!processingMethodId) {
      console.info(`Missing processing method: ${processingMethod}`);
    }

    const tasteNotesStrings = details['profil smakowy']?.split('\n').map((name) => name.trim().toLowerCase()) || [];
    const tasteNoteIds = Array.from(
      new Set(tasteNotes.filter(({ name }) => tasteNotesStrings.includes(name)).map(({ taste_note_id: id }) => id))
    );
    const missingTasteNotes = tasteNotesStrings.filter((note) => !tasteNotes.some(({ name }) => name === note));

    if (missingTasteNotes.length) {
      console.info(`Missing taste notes: ${missingTasteNotes}`);
    }

    const varietiesStrings =
      details['odmiana botaniczna']?.split(', ').map((name) => name.trim().toLocaleLowerCase()) || [];
    const varietyIds = varieties
      .filter(({ name }) => varietiesStrings.includes(name.toLowerCase()))
      .map(({ id }) => id);
    const missingVarieties = varietiesStrings.filter(
      (variety) => !varieties.some(({ name }) => name.toLowerCase() === variety)
    );

    if (missingVarieties.length) {
      console.info(`Missing varieties: ${missingVarieties}`);
    }

    const image = document.querySelector('.zdjecie-okragle').src;

    return {
      brewingMethodId,
      currency,
      image,
      originCountryId,
      originFarmId: null,
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
  },
  // BeMyBean
  39: async ({ html, url, roasterId }) => {
    console.info(`Parsing item page: ${url}`);

    const document = getDocument(html);

    const someInStock = JSON.parse(document.querySelector('.variations_form').dataset.product_variations)
      .map((product) => product.is_in_stock)
      .some(Boolean);

    if (!someInStock) {
      throw new Error(`All items at ${url} are out of stock`);
    }

    const priceElement =
      document.querySelector('.price > *:not(del) .woocommerce-Price-amount') ||
      document.querySelector('.price .woocommerce-Price-amount');

    if (!priceElement) {
      throw new Error(`Price element not found: ${url}`);
    }

    const price = parseFloat(priceElement.textContent);

    const currencySymbol = document.querySelector('.woocommerce-Price-currencySymbol').textContent;
    const currency = currencyCodes[currencySymbol];

    if (!currency) {
      throw new Error(`Unknown currency: ${currencySymbol}`);
    }

    const weight = Number(document.querySelector('#masa-netto option:not([value=""])').value.replaceAll('g', ''));
    console.debug(`weight for ${url}: ${weight}`);

    const pricePerGram = Number((price / weight).toFixed(2));

    const details = document
      .querySelector('[data-table_id="16f18dc"]')
      .textContent.replace(/\s\s+/gu, ' ')
      .trim()
      .toLowerCase();

    const originCountry = details
      .match(/kraj (.*) region/gu)
      .join()
      .replace('kraj ', '')
      .replace(' region', '')
      .trim();
    const originCountryId = originCountries.find(({ name }) => name === originCountry)?.origin_country_id || null;

    const brewingMethodElement = document.querySelector('[data-id="a074d76"]');
    const brewingMethodStrings = brewingMethodElement?.textContent
      .split(', ')
      .map((method) => method.trim().toLowerCase());

    const filterBrewingMethods = ['aeropress', 'drip', 'moccamaster', 'french press', 'kalita'];
    const isFilter = brewingMethodStrings?.some((method) =>
      filterBrewingMethods.some((filterMethod) => filterMethod.includes(method))
    );

    const espressoBrewingMethods = ['ekspres', 'kawiarka'];
    const isEspresso = brewingMethodStrings?.some((method) =>
      espressoBrewingMethods.some((espressoMethod) => espressoMethod.includes(method))
    );

    const brewingMethodId =
      brewingMethods.find(
        ({ name }) =>
          (isFilter && !isEspresso && name === 'filter') ||
          (isEspresso && !isFilter && name === 'espresso') ||
          name === 'omni'
      )?.brewing_method_id || null;

    const region = details
      .match(/region (.*) odmiana/gu)
      .join()
      .replace('region ', '')
      .replace(' odmiana', '')
      .trim();
    const originRegionId = originRegions.find(({ name }) => region.includes(name))?.origin_region_id || null;

    const processingMethod = details
      .match(/obróbka (.*)/gu)
      .join()
      .replace('obróbka ', '')
      .trim();
    const processingMethodId =
      processingMethods.find(
        ({ name }) =>
          name === processingMethod.replace(' decaf', '').replace(' / ', ' ').replace('natural natural', 'natural') ||
          (processingMethod === 'cautai, typica, bourbon, castillo' && name === 'washed') // bug in the website
      )?.processing_method_id || null;

    const tasteNotesElement = document.querySelector('[data-id="09140d8"]');
    const tasteNotesStrings =
      tasteNotesElement?.textContent
        .split(', ')
        .map((note) => note.replaceAll('\t', '').replaceAll('\n', '').trim().toLowerCase()) || [];
    const tasteNoteIds = tasteNotesStrings
      .map((note) => tasteNotes.find(({ name }) => name === note)?.taste_note_id)
      .filter(Boolean);

    const missingTasteNotes = tasteNotesStrings.filter((note) => !tasteNotes.some(({ name }) => name === note));

    if (missingTasteNotes.length) {
      console.info(`Missing taste notes: ${missingTasteNotes.join(', ')}`);
    }

    const varietiesString = details
      .match(/odmiana (.*) wysokość/gu)
      .join()
      .replace('odmiana ', '')
      .replace(' wysokość', '')
      .trim();
    const varietiesStrings = varietiesString.includes(', ') ? varietiesString.split(', ') : [varietiesString];
    const varietyIds = varieties
      .filter(({ name }) => varietiesStrings.includes(name.toLowerCase()))
      .map(({ id }) => id);

    if (!varietyIds.length) {
      console.info(`Missing varieties: ${varietiesStrings}`);
    }

    const isDecaf = processingMethod.includes('decaf');

    const image = document.querySelector('.woocommerce-product-gallery__wrapper img').src;

    return {
      brewingMethodId,
      currency,
      image,
      isDecaf,
      originCountryId,
      originFarmId: null,
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
  },
  // Heresy
  65: async ({ html, url, roasterId }) => {
    console.info(`Parsing item page: ${url}`);

    const document = getDocument(html);

    const price = parseFloat(
      document.querySelector('.price .woocommerce-Price-amount.amount').textContent.replaceAll(' zł', '')
    );

    const currencySymbol = document.querySelector('.summary .price .woocommerce-Price-currencySymbol').textContent;
    const currency = currencyCodes[currencySymbol];

    if (!currency) {
      throw new Error(`Unknown currency: ${url}`);
    }

    const weightElementValue = document.querySelector('#waga option[selected]').textContent.replaceAll(' g', '');
    const weight = parseFloat(weightElementValue);

    const pricePerGram = Number((price / weight).toFixed(2));

    const details = Array.from(document.querySelector('#tab-description p').querySelectorAll('strong')).reduce(
      (previousValue, currentValue) => {
        const key = currentValue.textContent.replace(':', '').trim().toLowerCase();
        const value = currentValue.nextSibling.textContent.trim().toLowerCase();

        previousValue[key] = value;

        return previousValue;
      },
      {}
    );

    const originCountry = details['kraj pochodzenia ziarna'];
    const originCountryId = originCountries.find(({ name }) => name === originCountry)?.origin_country_id || null;

    const originRegion = details.region;
    const originRegionId =
      originRegions.find(({ name }) => name === originRegion)?.origin_region_id ||
      originRegions.find(({ name }) => originRegion.includes(name))?.origin_region_id ||
      null;

    if (!originRegionId) {
      console.info(`Missing origin region: ${originRegion}`);
    }

    const originFarm = details.farma;
    const originFarmId = originFarms.find(({ name }) => name === originFarm)?.id || null;

    if (originFarm && !originFarmId) {
      console.info(`Missing origin farm: ${originFarm}`);
    }

    const processingMethod = details['obróbka'];
    const processingMethodId = processingMethods.find(({ name }) => name === processingMethod)?.processing_method_id;

    if (!processingMethodId) {
      console.debug(`Missing processing method: ${processingMethod}`);
    }

    const brewingMethod = document
      .querySelector('.ct-breadcrumbs .item-1 [itemprop="name"]')
      .textContent.trim()
      .toLowerCase();
    const brewingMethodId = brewingMethods.find(({ name }) => brewingMethod === name)?.brewing_method_id || null;

    const description = document
      .querySelector('.woocommerce-product-details__short-description')
      .textContent.trim()
      .toLowerCase();
    const translatedDescription = await translate({ text: description, from: 'pl', to: 'en' });
    const cleanTranslation = translatedDescription.replaceAll('-', ' ');

    const tasteNotesFound = tasteNotes.filter(({ name }) => cleanTranslation.includes(name));
    // exclude taste notes that include each other like st'raw'berry and 'raw'
    const distinctTasteNotes = tasteNotesFound.filter(
      ({ name }) => !tasteNotesFound.some(({ name: n }) => n !== name && n.includes(name))
    );
    const tasteNoteIds = distinctTasteNotes.map(({ taste_note_id: tasteNoteId }) => tasteNoteId);

    if (!tasteNoteIds.length) {
      console.debug(`No taste notes: ${cleanTranslation}, at ${url}`);
    }

    const varietiesStrings = details.odmiana
      .split(', ')
      .map((notes) => notes.split(' & '))
      .flat();
    const varietyIds = varieties
      .filter(({ name }) => varietiesStrings.includes(name.toLowerCase()))
      .map(({ id }) => id);
    const missingVarieties = varietiesStrings.filter(
      (variety) => !varieties.some(({ name }) => name.toLowerCase() === variety)
    );

    if (missingVarieties.length) {
      console.debug(`Missing varieties: ${missingVarieties.join(', ')}`);
    }

    const image =
      document.querySelectorAll('.ct-product-gallery-container figure img')[1]?.src ||
      document.querySelectorAll('.ct-product-gallery-container figure img')[0]?.src;

    if (!image) {
      throw new Error(`No image found: ${url}`);
    }

    return {
      brewingMethodId,
      currency,
      image,
      originCountryId,
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
