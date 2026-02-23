/* eslint-disable complexity */
import { JSDOM } from 'jsdom';

import { translate } from './AWS.js';
import logger from './Sentry/logger.js';
import currencyCodes from './currencies.js';
/* eslint-disable import/no-unresolved */
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

const errors = {
  brewingMethodMissing: 'Missing brewing method',
  currencyMissing: 'Missing currency',
  detailsMissing: 'Missing details',
  imageMissing: 'Missing image',
  originCountryMissing: 'Missing origin country',
  originRegionMissing: 'Missing origin region',
  priceMissing: 'Missing price',
  processingMethodMissing: 'Missing processing method',
  weightMissing: 'Missing weight'
};

const cleanPrice = ({ priceElement, currencySymbol = '€' }) =>
  Number(priceElement.textContent.toLowerCase().replaceAll(currencySymbol, '').replaceAll(',', '.').trim()).toFixed(2);

const parsers = {
  // Sheep & Raven
  6: ({ html, url, roasterId }) => {
    logger.info(`Parsing webshop item page ${url}`);

    const document = getDocument(html);

    const title = document.querySelector('h1.product-title').textContent.toLowerCase().trim();

    const price = Number(
      document.querySelector('.price .woocommerce-Price-amount').textContent.replaceAll(' zł', '').replaceAll(',', '.')
    ).toFixed(2);

    if (!price || isNaN(price)) {
      logger.error(`No price found for ${url}`);

      throw new Error(errors.priceMissing);
    }

    const currencySymbol = document.querySelector('.woocommerce-Price-currencySymbol').textContent;
    const currency = currencyCodes[currencySymbol];

    if (!currency) {
      logger.error(`No currency found for ${url}`);

      throw new Error(errors.currencyMissing);
    }

    const weightElement =
      document.querySelector('.swatch_label') ||
      document.querySelector(
        '.woocommerce-product-attributes-item--weight .woocommerce-product-attributes-item__value'
      );

    if (!weightElement) {
      logger.error(`No weight found for ${url}`);

      throw new Error(errors.weightMissing);
    }

    const weight = Number(
      weightElement.dataset?.value?.replaceAll('g-en', '') || weightElement.textContent.replace(' g', '').trim()
    );

    if (!weight || isNaN(weight)) {
      logger.error(`No weight found for ${url}`);

      throw new Error(errors.weightMissing);
    }

    const pricePerGram = Number((price / weight).toFixed(2));

    const originCountry = document.querySelector('[data-id="4cb216da"]').textContent.trim().toLowerCase();

    if (originCountry === 'blend') {
      return { isBlend: true };
    }

    const originCountryId =
      originCountries.find(({ name }) => name === originCountry)?.origin_country_id ||
      originCountries.find(({ name }) => url.includes(name))?.origin_country_id ||
      null;

    if (!originCountryId) {
      logger.error(`No origin country found for ${url}`);

      throw new Error(errors.originCountryMissing);
    }

    const brewingMethod = document.querySelector('[data-id="4af2f61c"]').textContent.trim().toLowerCase();
    const brewingMethodId =
      brewingMethods.find(
        ({ name }) =>
          name === brewingMethod ||
          ((brewingMethod === 'espresso / pour over' || brewingMethod === 'pour over/espresso') && name === 'omni')
      )?.brewing_method_id || null;

    const regionOrFarm = document.querySelector('[data-id="15362af"]').textContent.trim().toLowerCase();

    const originRegionId = originRegions.find(({ name }) => regionOrFarm.includes(name))?.origin_region_id || null;
    const originFarmId = originFarms.find(({ name }) => regionOrFarm.includes(name))?.id || null;

    const processingMethod = document.querySelector('[data-id="16e90837"]').textContent.trim().toLowerCase();
    const processingMethodId =
      processingMethods.find(({ name }) => name === processingMethod)?.processing_method_id ||
      processingMethods.find(({ name }) => processingMethod.includes(name))?.processing_method_id ||
      null;

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

    const varietiesString = document.querySelector('[data-id="512fea5c"]').textContent.trim().toLowerCase();
    let varietiesStrings;

    if (varietiesString.includes('/')) {
      varietiesStrings = varietiesString.split('/').map((s) => s.trim());
    } else if (varietiesString.includes(',')) {
      varietiesStrings = varietiesString.split(',').map((s) => s.trim());
    } else {
      varietiesStrings = [varietiesString];
    }

    const varietyIds = varieties
      .filter(
        ({ name, alias }) =>
          varietiesStrings.includes(name.toLowerCase()) ||
          (alias && varietiesStrings.includes(alias.toLowerCase())) ||
          (name.toLowerCase() === 'cuscatleco' && varietiesStrings.includes('cuzcatleco')) // typo
      )
      .filter(({ name }) => name.toLowerCase() !== originCountry)
      .map(({ id }) => id);

    if (!varietyIds.length) {
      logger.info(`Missing varieties: ${varietiesStrings}`);
    }

    const isDecaf = url.includes('decaf') || title.includes('decaf');

    const image = document.querySelector('.woocommerce-product-gallery__wrapper img').src;

    return {
      brewingMethodId,
      currency,
      image,
      isDecaf,
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
    logger.info(`Parsing webshop item page: ${url}`);

    const document = getDocument(html);

    const price = cleanPrice({ priceElement: document.querySelector('.current-price-value'), currencySymbol: 'zł' });

    if (!price || isNaN(price)) {
      logger.error(`No price found for ${url}`);

      throw new Error(errors.priceMissing);
    }

    const currency = 'PLN';

    const weight = Number(
      document.querySelector('select[name="group[8]"] option[selected]').textContent.replace(' g', '')
    );

    if (!weight || isNaN(weight)) {
      logger.error(`No weight found for ${url}`);

      throw new Error(errors.weightMissing);
    }

    const pricePerGram = Number((price / weight).toFixed(2));

    let detailsElements = document.querySelectorAll('.data-sheet dt');

    if (!detailsElements.length) {
      detailsElements = document.querySelectorAll('.product-description td:has(strong)');
    }

    const details = Array.from(detailsElements).reduce((newDetails, nameElement) => {
      const name = nameElement.textContent.toLowerCase();
      const value = nameElement.nextElementSibling.textContent.toLowerCase();

      return { ...newDetails, [name]: value };
    }, {});

    if (details['skład']?.includes('robusta')) {
      logger.info(`Skipping robusta: ${url}`);

      return {};
    }

    const originCountry = details.pochodzenie;
    const originCountryId =
      originCountries.find(({ name }) => name === originCountry)?.origin_country_id ||
      originCountries.find(({ name }) => document.querySelector('h1').textContent.toLowerCase().includes(name))
        ?.origin_country_id ||
      null;

    if (!originCountryId) {
      logger.error(`No origin country found for ${url}`);

      throw new Error(errors.originCountryMissing);
    }

    const originRegion = details.region;
    const originRegionId = originRegions.find(({ name }) => name === originRegion)?.origin_region_id || null;

    if (!originRegionId) {
      logger.info(
        `Missing origin region: ${originCountry || originCountries.find(({ origin_country_id: id }) => id === originCountryId)?.name} - ${originRegion}`
      );
    }

    const brewingMethod = details['profil palenia'];
    const brewingMethodId = brewingMethods.find(({ name }) => name === brewingMethod)?.brewing_method_id || null;

    if (!brewingMethodId) {
      logger.info(`Missing brewing method: ${brewingMethod}`);
    }

    const processingMethod = details['obróbka'];
    const processingMethodId =
      processingMethods.find(
        ({ name }) => name === processingMethod || (name === 'washed' && processingMethod === 'myta')
      )?.processing_method_id || null;

    if (!processingMethodId) {
      logger.info(`Missing processing method: ${processingMethod}`);
    }

    const tasteNotesStrings = details['profil smakowy']
      ? details['profil smakowy'].split('\n').map((name) => name.trim().toLowerCase())
      : document
          .querySelector('.product-description b, .product-description strong')
          ?.textContent.toLowerCase()
          .split(', ');

    const tasteNoteIds = Array.from(
      new Set(tasteNotes.filter(({ name }) => tasteNotesStrings.includes(name)).map(({ taste_note_id: id }) => id))
    );
    const missingTasteNotes = tasteNotesStrings.filter((note) => !tasteNotes.some(({ name }) => name === note));

    if (missingTasteNotes.length) {
      logger.info(`Missing taste notes: ${missingTasteNotes}`);
    }

    const varietiesStrings =
      details['odmiana botaniczna']?.split(', ').map((name) => name.trim().toLocaleLowerCase()) || [];
    const varietyIds = varieties
      .filter(
        ({ name, alias }) =>
          varietiesStrings.includes(name.toLowerCase()) ||
          (name.toLowerCase() === 'heirloom' && varietiesStrings.includes('heriloom')) || // typo
          (alias && varietiesStrings.includes(alias.toLowerCase()))
      )
      .filter(({ name }) => name.toLowerCase() !== originCountry)
      .map(({ id }) => id);
    const missingVarieties = varietiesStrings.filter(
      (variety) =>
        !varieties.some(
          ({ name, alias }) =>
            name.toLowerCase() === variety ||
            (name.toLowerCase() === 'heirloom' && variety === 'heriloom') || // typo
            (alias && alias.toLowerCase() === variety)
        )
    );

    if (missingVarieties.length) {
      logger.info(`Missing varieties: ${missingVarieties}`);
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
  // Typika
  14: ({ html, url, roasterId }) => {
    logger.info(`Parsing item page: ${url}`);

    const document = getDocument(html);

    if (document.querySelector('.product__title').textContent.toLowerCase().includes('blend')) {
      logger.info(`Skipping blend: ${url}`);

      return { isBlend: true };
    }

    const priceElement = document.querySelector('[data-price]');
    const currencySymbol =
      priceElement && Object.keys(currencyCodes).find((key) => priceElement.textContent.toLowerCase().includes(key));

    if (!currencySymbol) {
      logger.debug(`Price element text: '${priceElement?.textContent}'`);
      logger.error(`No currency found for ${url}`);

      throw new Error(errors.currencyMissing);
    }

    const currency = currencyCodes[currencySymbol];

    const price = cleanPrice({ priceElement, currencySymbol });

    if (!price || isNaN(price)) {
      logger.debug(`Price element text: '${priceElement?.textContent}'`);
      logger.error(`No price found for ${url}`);

      throw new Error(errors.priceMissing);
    }

    const weight = Number(
      document.querySelector('.product__variants-wrapper [data-selected-value-for-option]').textContent.replace('g', '')
    );

    if (!weight || isNaN(weight)) {
      logger.debug(
        `Weight element text: '${document.querySelector('.product__variants-wrapper [data-selected-value-for-option]').textContent}'`
      );
      logger.error(`No weight found for ${url}`);

      throw new Error(errors.weightMissing);
    }

    const pricePerGram = Number((price / weight).toFixed(2));

    const details = Array.from(document.querySelectorAll('.product-information__additional__line')).map((element) =>
      element.textContent.trim().toLowerCase()
    );

    const originCountry = originCountries.find(({ name }) =>
      details.some((detail) => detail.includes(name) || url.includes(name))
    );
    const originCountryId = originCountry?.origin_country_id || null;

    if (!originCountryId) {
      logger.error(`No origin country found for ${url}`);

      throw new Error(errors.originCountryMissing);
    }

    const originRegion = originRegions.find(({ name }) => details.some((detail) => detail.includes(name)));
    const originRegionId = originRegion?.origin_region_id || null;

    const processingMethodId =
      processingMethods.find(({ name }) => details.some((detail) => detail.includes(name.toLowerCase())))
        ?.processing_method_id || null;

    const brewingMethodId =
      brewingMethods.find(
        ({ name }) => details.some((detail) => detail.includes(name.toLowerCase())) || url.includes(name.toLowerCase())
      )?.brewing_method_id || null;

    const tasteNotesString = Array.from(document.querySelectorAll('.product-information__additional__line strong'))
      .map((element) => element.textContent.toLowerCase())
      .join('')
      .replace('additional information:', '');
    const tasteNoteElement = tasteNotesString.includes('flavor profile:')
      ? tasteNotesString.split('flavor profile:')[1]
      : undefined;
    const tasteNoteStrings = tasteNoteElement?.split(', ').map((note) => note.trim());
    const tasteNoteIds = tasteNotes
      .filter(({ name, alias }) => tasteNoteStrings.some((note) => name === note || alias === note))
      .map(({ taste_note_id: id }) => id);

    const varietyIds = details.reduce((newVarietyIds, detail) => {
      varieties.forEach(({ id, name, alias }) => {
        if (
          !newVarietyIds.includes(id) &&
          (detail.includes(name.toLowerCase()) || (alias && detail.includes(alias.toLowerCase()))) &&
          name.toLowerCase() !== originCountry.name.toLowerCase() // Colombia is both origin country and variety
        ) {
          newVarietyIds.push(id);
        }
      });

      return newVarietyIds;
    }, []);

    const isDecaf = url.includes('decaf');

    const image = `https:${document.querySelector('.product__media img')?.src.replace(/&width=[0-9]+/gu, '')}`;

    return {
      brewingMethodId,
      currency,
      image,
      isDecaf,
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
  },
  // BeMyBean
  39: async ({ html, url, roasterId }) => {
    logger.info(`Parsing item page: ${url}`);

    const document = getDocument(html);

    if (document.querySelector('h1').textContent.toLowerCase().includes('zestaw prezentowy')) {
      return { isGiftSet: true };
    }

    const someInStock = JSON.parse(document.querySelector('.variations_form').dataset.product_variations)
      .map((product) => product.is_in_stock)
      .some(Boolean);

    if (!someInStock) {
      return { isOutOfStock: true };
    }

    const currencySymbol = document.querySelector('.woocommerce-Price-currencySymbol').textContent.toLowerCase();

    const priceElement =
      document.querySelector('.price > *:not(del) .woocommerce-Price-amount') ||
      document.querySelector('.price .woocommerce-Price-amount');
    const price = cleanPrice({ priceElement, currencySymbol });

    if (!price || isNaN(price)) {
      logger.error(`No price found for ${url}`);

      throw new Error(errors.priceMissing);
    }

    const currency = currencyCodes[currencySymbol];

    if (!currency) {
      logger.error(`Unknown currency: ${currencySymbol}`);

      throw new Error(`Unknown currency: ${currencySymbol}`);
    }

    const weight = Number(document.querySelector('#masa-netto option:not([value=""])').value.replaceAll('g', ''));

    if (!weight || isNaN(weight)) {
      logger.error(`No weight found for ${url}`);

      throw new Error(errors.weightMissing);
    }

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

    if (originCountry.includes(' / ')) {
      return { isBlend: true };
    }

    const originCountryId =
      originCountries.find(({ name }) => name === originCountry)?.origin_country_id ||
      originCountries.find(({ name }) => originCountry.includes(name))?.origin_country_id ||
      null;

    if (!originCountryId) {
      logger.error(`No origin country found for ${url}`);

      throw new Error(errors.originCountryMissing);
    }

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
      logger.info(`Missing taste notes: ${missingTasteNotes.join(', ')}`);
    }

    const varietiesString =
      processingMethod === 'cautai, typica, bourbon, castillo' // bug in the website
        ? processingMethod
        : details
            .match(/odmiana (.*) wysokość/gu)
            .join()
            .replace('odmiana ', '')
            .replace(' wysokość', '')
            .trim();
    const varietiesStrings = varietiesString.includes(', ') ? varietiesString.split(', ') : [varietiesString];
    const varietyIds = varieties
      .filter(
        ({ name, alias }) =>
          varietiesStrings.includes(name.toLowerCase()) || (alias && varietiesStrings.includes(alias.toLowerCase()))
      )
      .filter(({ name }) => name.toLowerCase() !== originCountry)
      .map(({ id }) => id);

    if (!varietyIds.length) {
      logger.info(`Missing varieties: ${varietiesStrings}`);
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
    logger.info(`Parsing item page: ${url}`);

    const document = getDocument(html);

    const title = document.querySelector('.product_title').textContent.trim().toLowerCase();

    if (title.includes(' + ')) {
      return { isBlend: true };
    }

    const price = Number(
      document
        .querySelector('.price .woocommerce-Price-amount.amount')
        .textContent.replaceAll(' zł', '')
        .replace(',', '.')
    ).toFixed(2);

    if (!price || isNaN(price)) {
      logger.error(`No price found for ${url}`);

      throw new Error(errors.priceMissing);
    }

    const currencySymbol = document.querySelector('.summary .price .woocommerce-Price-currencySymbol').textContent;
    const currency = currencyCodes[currencySymbol];

    if (!currency) {
      logger.error(`Unknown currency: ${currencySymbol}`);

      throw new Error(`Unknown currency: ${url}`);
    }

    const weightElementValue = document.querySelector('#waga option[selected]').textContent.replaceAll(' g', '');
    const weight = parseFloat(weightElementValue);

    if (!weight || isNaN(weight)) {
      logger.error(`No weight found for ${url}`);

      throw new Error(errors.weightMissing);
    }

    const pricePerGram = Number((price / weight).toFixed(2));

    const details = Array.from(
      document.querySelector('#tab-description p')?.querySelectorAll('strong') ||
        document.querySelectorAll('#tab-additional_information .woocommerce-product-attributes-item__label')
    ).reduce((previousValue, currentValue) => {
      const key = currentValue.textContent.replace(':', '').trim().toLowerCase();
      const value = currentValue.nextSibling.textContent.trim().toLowerCase();

      previousValue[key] = value;

      return previousValue;
    }, {});

    const originCountry = details['kraj pochodzenia ziarna'];
    const originCountryId = originCountries.find(({ name }) => name === originCountry)?.origin_country_id || null;

    if (!originCountryId) {
      logger.error(`No origin country found for ${url}`);

      throw new Error(errors.originCountryMissing);
    }

    const originRegion = details.region;
    const originRegionId =
      originRegions.find(({ name }) => name === originRegion)?.origin_region_id ||
      originRegions.find(({ name }) => originRegion.includes(name))?.origin_region_id ||
      null;

    if (!originRegionId) {
      logger.info(`Missing origin region: ${originRegion}`);
    }

    const originFarm = details.farma;
    const originFarmId = originFarms.find(({ name }) => name === originFarm)?.id || null;

    if (originFarm && !originFarmId) {
      logger.info(`Missing origin farm: ${originFarm}`);
    }

    const processingMethod = details['obróbka'];
    const processingMethodId =
      processingMethods.find(({ name }) => name === processingMethod)?.processing_method_id ||
      processingMethods.find(({ name }) => processingMethod.includes(name))?.processing_method_id;

    if (!processingMethodId) {
      logger.debug(`Missing processing method: ${processingMethod}`);
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
      logger.debug(`No taste notes: ${cleanTranslation}, at ${url}`);
    }

    const varietiesStrings = details.odmiana
      .split(', ')
      .map((notes) => notes.split(' & '))
      .flat();
    const varietyIds = varieties
      .filter(
        ({ name, alias }) =>
          varietiesStrings.includes(name.toLowerCase()) || (alias && varietiesStrings.includes(alias.toLowerCase()))
      )
      .filter(({ name }) => name.toLowerCase() !== originCountry)
      .map(({ id }) => id);
    const missingVarieties = varietiesStrings.filter(
      (variety) =>
        !varieties.some(
          ({ name }) => name.toLowerCase() === variety || (name.toLowerCase() === '74158' && variety === 'wolega') // typo
        ) && !varieties.some(({ alias }) => alias?.toLowerCase() === variety)
    );

    if (missingVarieties.length) {
      logger.debug(`Missing varieties: ${missingVarieties.join(', ')}`);
    }

    const image = document.querySelectorAll('.ct-product-gallery-container figure img')[0]?.src;

    if (!image) {
      logger.error(`No image found for ${url}`);

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
  },
  // Klaro
  70: async ({ html, url, roasterId }) => {
    logger.info(`Parsing item page: ${url}`);

    const document = getDocument(html);

    const price = Number(
      document
        .querySelector('.price .woocommerce-Price-amount.amount')
        .textContent.replaceAll(' zł', '')
        .replace(',', '.')
    ).toFixed(2);

    if (!price || isNaN(price)) {
      logger.error(`No price found for ${url}`);

      throw new Error(errors.priceMissing);
    }

    const currencySymbol = document.querySelector('.summary .price .woocommerce-Price-currencySymbol').textContent;
    const currency = currencyCodes[currencySymbol];

    if (!currency) {
      logger.error(`Unknown currency: ${currencySymbol}`);

      throw new Error(`Unknown currency: ${url}`);
    }

    const weightElementValue = document
      .querySelector('.woocommerce-product-attributes-item--weight td')
      .textContent.replaceAll(' kg', '')
      .replaceAll(',', '.');
    // convert to grams, sometimes the weight element is incorrect so we check the url first
    const weight = url.includes('1-kg') ? 1000 : parseFloat(weightElementValue) * 1000;

    if (!weight || isNaN(weight)) {
      logger.error(`No weight found for ${url}`);

      throw new Error(errors.weightMissing);
    }

    const pricePerGram = Number((price / weight).toFixed(2));

    const originCountry = originCountries.find(({ name }) => url.replaceAll('-', ' ').includes(name));
    const originCountryId = originCountry?.origin_country_id;

    if (!originCountryId) {
      logger.error(`No origin country found for ${url}`);

      throw new Error(errors.originCountryMissing);
    }

    const originRegion = document
      .querySelector('.woocommerce-product-attributes-item--attribute_region td')
      .textContent.toLowerCase();
    const originRegionId = originRegions.find(({ name }) => originRegion.includes(name))?.origin_region_id || null;

    if (!originRegionId) {
      logger.debug(`Missing origin region: ${originRegion.textContent}`);
    }

    const processingMethod = document
      .querySelector('.woocommerce-product-attributes-item--attribute_process td')
      .textContent.trim()
      .toLowerCase();
    const processingMethodId = processingMethods.find(({ name }) => name === processingMethod)?.processing_method_id;

    if (!processingMethodId) {
      logger.debug(`Missing processing method: ${processingMethod}`);
    }

    const brewingMethodId = brewingMethods.find(({ name }) => url.includes(name))?.brewing_method_id || null;

    const tasteNoteValues = document
      .querySelector('.woocommerce-product-attributes-item--attribute_taste td')
      .textContent.trim()
      .toLowerCase()
      .split(', ');
    const tasteNoteIds = tasteNoteValues
      .map((tasteNote) => tasteNotes.find(({ name }) => name === tasteNote)?.taste_note_id)
      .filter(Boolean);
    const missingTasteNotes = tasteNoteValues.filter((tasteNote) => !tasteNotes.some(({ name }) => name === tasteNote));

    if (missingTasteNotes.length) {
      logger.debug(`Missing taste notes: ${missingTasteNotes.join(', ')}`);
    }

    const varietiesStrings = document
      .querySelector('.woocommerce-product-attributes-item--attribute_variety td')
      .textContent.trim()
      .toLowerCase()
      .split(', ');
    const varietyIds = varieties
      .filter(
        ({ name, alias }) =>
          varietiesStrings.includes(name.toLowerCase()) ||
          (alias && varietiesStrings.includes(alias.toLowerCase())) ||
          (name.toLowerCase() === 'mundo novo' && varietiesStrings.includes('mundo movo')) // typo
      )
      .filter(({ name }) => name.toLowerCase() !== originCountry)
      .map(({ id }) => id);
    const missingVarieties = varietiesStrings.filter(
      (variety) =>
        !varieties.some(
          ({ name, alias }) =>
            name.toLowerCase() === variety ||
            (alias && alias.toLowerCase() === variety) ||
            (name.toLowerCase() === 'mundo novo' && variety === 'mundo movo') // typo
        )
    );

    if (missingVarieties.length) {
      logger.debug(`Missing varieties: ${missingVarieties.join(', ')}`);
    }

    const isDecaf = url.includes('decaf');

    const image = document.querySelector('img.wp-post-image').src;

    if (!image) {
      logger.error(`No image found for ${url}`);

      throw new Error(`No image found: ${url}`);
    }

    return {
      brewingMethodId,
      currency,
      image,
      isDecaf,
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
  },
  // Spojka
  82: async ({ html, url, roasterId }) => {
    logger.info(`Parsing item page: ${url}`);
    const document = getDocument(html);

    const price = Number(
      document.querySelector('.price-item').textContent.replaceAll(' €', '').replace(',', '.')
    ).toFixed(2);

    if (!price || isNaN(price)) {
      logger.error(`No price found for ${url}`);

      throw new Error(errors.priceMissing);
    }

    const currencySymbol = document.querySelector('.price-item').textContent.includes('€') ? '€' : undefined;
    const currency = currencyCodes[currencySymbol];

    if (!currency) {
      logger.error(`Unknown currency: ${currencySymbol}`);

      throw new Error(`Unknown currency: ${url}`);
    }

    const weightElementValue =
      document.querySelector('.metafield-number_integer')?.textContent ||
      document.querySelector('[name=Packaging]:checked')?.value.replace('g', '') ||
      document.querySelector('[name=balenie]:checked')?.value.replace('g', '') ||
      document.querySelector('#template--24932172071240__main-1-0')?.value.replace('g', '');
    const weight = parseFloat(weightElementValue);

    if (!weight || isNaN(weight)) {
      logger.error(`No weight found for ${url}`);

      throw new Error(errors.weightMissing);
    }

    const pricePerGram = Number((price / weight).toFixed(2));

    const details = Array.from(document.querySelectorAll('.product__sku2')).reduce((previousValue, currentValue) => {
      const key = currentValue.textContent.trim().toLowerCase();
      const value = currentValue.nextElementSibling.textContent.trim().toLowerCase();

      previousValue[key] = value;

      return previousValue;
    }, {});

    const originCountry =
      details.lokalita === 'cherry likér, jablko, hrozno, čierna ríbezľa, jahoda' // bad data
        ? 'indonesia'
        : details.lokalita;

    if (!originCountry) {
      logger.error(`No origin country found for ${url}`);

      throw new Error(errors.originCountryMissing);
    }

    const originCountryTranslated = await translate({ text: originCountry, from: 'cs', to: 'en' });
    const originCountryId =
      originCountries.find(({ name }) => name === originCountry)?.origin_country_id ||
      originCountries.find(({ name }) => name === originCountryTranslated)?.origin_country_id ||
      null;

    if (!originCountryId) {
      logger.error(`No origin country found for ${url}`);

      throw new Error(errors.originCountryMissing);
    }

    const processingMethod = (await translate({ text: details.spracovanie, from: 'cs', to: 'en' }))
      .trim()
      .toLowerCase();
    const processingMethodId =
      processingMethods.find(({ name }) => name.toLowerCase() === details.spracovanie)?.processing_method_id ||
      processingMethods.find(({ name }) => name.toLowerCase() === processingMethod)?.processing_method_id ||
      processingMethods.find(({ name }) => processingMethod.includes(name.toLowerCase()))?.processing_method_id;

    if (!processingMethodId) {
      logger.debug(`Missing processing method: ${processingMethod} for ${url}`);
    }

    const brewingMethodId = brewingMethods.find(({ name }) => name === 'omni')?.brewing_method_id || null;

    const tasteNotesStrings = details['chuťový profil'];
    const translatedTasteNotes = await translate({ text: tasteNotesStrings, from: 'cs', to: 'en' });
    const cleanTranslation = translatedTasteNotes.toLowerCase().split(', ');

    const tasteNotesFound = tasteNotes.filter(({ name }) => cleanTranslation.includes(name));
    // exclude taste notes that include each other like st'raw'berry and 'raw'
    const distinctTasteNotes = tasteNotesFound.filter(
      ({ name }) => !tasteNotesFound.some(({ name: n }) => n !== name && n.includes(name))
    );
    const tasteNoteIds = distinctTasteNotes.map(({ taste_note_id: tasteNoteId }) => tasteNoteId);

    if (!tasteNoteIds.length) {
      logger.debug(`No taste notes: ${cleanTranslation}, at ${url}`);
    }

    const isDecaf = url.includes('decaf');

    const imageSrc = document.querySelector('img.global-media-settings')?.src;

    if (!imageSrc) {
      logger.error(`No image found for ${url}`);

      throw new Error(`No image found: ${url}`);
    }

    const image = `http:${imageSrc.slice(0, imageSrc.lastIndexOf('?')) || ''}`;

    return {
      brewingMethodId,
      currency,
      image,
      isDecaf,
      originCountryId,
      price,
      pricePerGram,
      processingMethodId,
      roasterId,
      tasteNoteIds,
      webshopItemLink: url,
      weight
    };
  },
  // Meron
  252: async ({ html, url, roasterId }) => {
    logger.info(`Parsing item page: ${url}`);

    const document = getDocument(html);

    const price = Number(
      document
        .querySelector('.price .woocommerce-Price-amount.amount')
        .textContent.replaceAll(' €', '')
        .replace(',', '.')
    ).toFixed(2);

    if (!price || isNaN(price)) {
      logger.error(`No price found for ${url}`);

      throw new Error(errors.priceMissing);
    }

    const currencySymbol = document.querySelector('.summary .price .woocommerce-Price-currencySymbol').textContent;
    const currency = currencyCodes[currencySymbol];

    if (!currency) {
      logger.error(`No currency found for ${url}`);

      throw new Error(errors.currencyMissing);
    }

    const details = Array.from(document.querySelectorAll('.info-tab-tabel tr')).reduce((_details, row) => {
      const cells = Array.from(row.querySelectorAll('td'));

      if (!cells?.length) {
        return _details;
      }

      const key = cells[0].textContent.trim().toLowerCase().replace(':', '');
      const value = cells[1].textContent.trim().toLowerCase();

      return { ..._details, [key]: value };
    }, {});

    const weight = Number(details.volume.replace(' gr', ''));

    if (!weight || isNaN(weight)) {
      logger.error(`No weight found for ${url}`);

      throw new Error(errors.weightMissing);
    }

    const pricePerGram = Number((price / weight).toFixed(2));

    const originCountry = originCountries.find(
      ({ name }) => name === details['country of origin'] || url.includes(name)
    );
    const originCountryId = originCountry?.origin_country_id || null;

    if (!originCountryId) {
      logger.error(`No origin country found for ${url}`);

      throw new Error(errors.originCountryMissing);
    }

    const region = details.region;
    const originRegionId = originRegions.find(({ name }) => region?.includes(name))?.origin_region_id || null;

    const farm = details['farm / farmer'];
    const originFarmId =
      originFarms.find(
        ({ name, origin_country_id }) => farm?.includes(name) && originCountryId === origin_country_id // eslint-disable-line camelcase
      )?.id || null;

    const isEspresso = details.recommendations.includes('espresso');
    const isFilter = details.recommendations.includes('filter');
    const brewingMethodId =
      brewingMethods.find(
        ({ name }) =>
          (isEspresso && isFilter && name === 'omni') ||
          (isEspresso && !isFilter && name === 'espresso') ||
          (!isEspresso && isFilter && name === 'filter') ||
          details.recommendations.includes(name)
      )?.brewing_method_id || null;

    const roastingLevelId =
      roastingLevels.find(({ name }) => details['roasting profile'].includes(name))?.roasting_level_id || null;

    const detailsTasteNotes = details['tasting notes'].split(',').map((note) => note.trim());

    const tasteNoteIds = Array.from(
      new Set(tasteNotes.filter(({ name }) => detailsTasteNotes.includes(name)).map(({ taste_note_id: id }) => id))
    );

    const description = document.querySelector('.woocommerce-Tabs-panel--description').textContent.toLowerCase();
    const varietiesFound = varieties.filter(
      ({ name, alias }) =>
        description.includes(name.toLowerCase()) || (alias && description.includes(alias.toLowerCase()))
    );
    // exclude varieties that include each other like Ruiru and Ruiru 11
    const distinctVarieties = varietiesFound.filter(
      ({ name }) => !varietiesFound.some(({ name: n }) => n !== name && n.includes(name))
    );
    const uniqueVarietyIds = Array.from(
      new Set(distinctVarieties.filter(({ name }) => name.toLowerCase() !== originCountry).map(({ id }) => id))
    );

    const isDecaf = url.includes('decaf');

    const image = document.querySelector('.woocommerce-product-gallery__image img').src;

    return {
      brewingMethodId,
      currency,
      image,
      isDecaf,
      originCountryId,
      originFarmId,
      originRegionId,
      price,
      pricePerGram,
      roasterId,
      roastingLevelId,
      tasteNoteIds,
      varietyIds: uniqueVarietyIds,
      webshopItemLink: url,
      weight
    };
  },
  // Father's (Czech)
  277: async ({ html, url, roasterId }) => {
    logger.info(`Parsing item page: ${url}`);

    const document = getDocument(html);

    const price = Number(
      document
        .querySelector('.price.nasa-single-product-price .woocommerce-Price-amount')
        .textContent.replaceAll('€ ', '')
        .replace(',', '.')
    ).toFixed(2);

    const currencySymbol = document.querySelector('.woocommerce-Price-currencySymbol').textContent;
    const currency = currencyCodes[currencySymbol];

    if (!currency) {
      logger.error(`No currency found for ${url}`);

      throw new Error(errors.currencyMissing);
    }

    const weightElement = document.querySelector('div[data-attribute_name="attribute_pa_vaha"] .nasa-attr-text');

    if (!weightElement) {
      logger.error(`No weight found for ${url}`);

      throw new Error(errors.weightMissing);
    }

    const weight = Number(weightElement.textContent.replace('g', ''));

    if (!weight || isNaN(weight)) {
      logger.error(`No weight found for ${url}`);

      throw new Error(errors.weightMissing);
    }

    const pricePerGram = Number((price / weight).toFixed(2));

    let detailNames = Array.from(document.querySelectorAll('.woocommerce-product-details__short-description b')).map(
      (element) => element.textContent.trim().toLowerCase().replace(':', '')
    );

    if (detailNames.length === 0) {
      detailNames = Array.from(document.querySelectorAll('.woocommerce-product-details__short-description strong')).map(
        (element) => element.textContent.trim().toLowerCase().replace(':', '')
      );
    }

    let detailValues = Array.from(document.querySelectorAll('.woocommerce-product-details__short-description b')).map(
      (element) => element.nextSibling?.textContent.trim().toLowerCase()
    );

    if (detailValues.length === 0) {
      detailValues = Array.from(
        document.querySelectorAll('.woocommerce-product-details__short-description strong')
      ).map((element) => element.nextSibling?.textContent.trim().toLowerCase());
    }

    if (detailValues.length === 0) {
      detailValues = Array.from(document.querySelectorAll('.woocommerce-product-details__short-description i')).map(
        (element) => element.textContent.trim().toLowerCase()
      );
    }

    const details = detailNames.reduce((_details, name, index) => ({ ..._details, [name]: detailValues[index] }), {});

    if (Object.keys(details).length === 0 || !details.country) {
      logger.error(`No details found at: ${url}`);

      return {};
    }

    const originCountry = details.country;
    const originCountryId = originCountries.find(({ name }) => name === originCountry)?.origin_country_id || null;

    const processingMethodId =
      processingMethods.find(({ name }) => name === details.process || name === details.processing)
        ?.processing_method_id ||
      processingMethods.find(({ name }) => details.process?.includes(name) || details.processing?.includes(name))
        ?.processing_method_id ||
      null;

    const brewingMethod = document.querySelector('.br_alabel_better_compatibility').textContent.trim().toLowerCase();
    const brewingMethodId =
      brewingMethods.find(
        ({ name }) => name === brewingMethod || (brewingMethod === 'espresso / pour over' && name === 'omni')
      )?.brewing_method_id || null;

    const regionOrFarm = details.region;

    const originRegionId = originRegions.find(({ name }) => regionOrFarm.includes(name))?.origin_region_id || null;
    const originFarmId = originFarms.find(({ name }) => regionOrFarm.includes(name))?.id || null;

    const tasteNotesString =
      details['taste notes'] ||
      details['tasting notes'] ||
      details['taste profile'] ||
      details['cup profile'] ||
      details['flavour notes'] ||
      details['flavour profile'] ||
      details['flavor profile'];
    const tasteNoteIds =
      tasteNotesString
        ?.split(', ')
        .map((note) => note.trim().toLowerCase())
        .map((note) => tasteNotes.find(({ name }) => name === note)?.taste_note_id)
        .filter(Boolean) || [];

    if (!tasteNotesString) {
      logger.debug(url, ': ', details);
    }

    const missingTasteNotes = tasteNotesString
      ?.split(', ')
      .filter((note) => !tasteNotes.some(({ name }) => name === note.trim().toLowerCase()));

    if (missingTasteNotes.length) {
      logger.info(`Missing taste notes: ${missingTasteNotes.join(', ')}`);
    }

    const varietiesString = details.variety || details.varietal;
    const varietiesStrings = varietiesString.includes(', ') ? varietiesString.split(', ') : [varietiesString];
    const varietyIds = varieties
      .filter(
        ({ name, alias }) =>
          varietiesStrings.includes(name.toLowerCase()) || (alias && varietiesStrings.includes(alias.toLowerCase()))
      )
      .filter(({ name }) => name.toLowerCase() !== originCountry)
      .map(({ id }) => id);

    if (!varietyIds.length) {
      logger.info(`Missing varieties: ${varietiesStrings}`);
    }

    const image = document.querySelector('.nasa-item-main-image-wrap .wp-post-image').src;

    const isDecaf = details.processing?.includes('decaf') || details.process?.includes('decaf');

    return {
      brewingMethodId,
      currency,
      image,
      isDecaf,
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
  // PALE
  278: async ({ html, url, roasterId }) => {
    logger.info(`Parsing item page: ${url}`);

    const document = getDocument(html);

    const optionsPrice = document
      .querySelector('.wapf-checked .wapf-pricing-hint')
      ?.textContent.replace('(+', '')
      .replace('zł)', '')
      .replace(',', '.')
      .trim();
    const priceAmount = document.querySelector('.woocommerce-Price-amount')?.textContent;

    const price = Number(priceAmount) + (optionsPrice ? Number(optionsPrice).toFixed(2) : 0).toFixed(2);

    if (!price || isNaN(price)) {
      logger.error(`No price found for ${url}`);

      throw new Error(errors.priceMissing);
    }

    const currencySymbol = document.querySelector('.woocommerce-Price-currencySymbol').textContent;
    const currency = currencyCodes[currencySymbol];

    if (!currency) {
      logger.error(`No currency found for ${url}`);

      throw new Error(errors.currencyMissing);
    }

    const weightSelectionValue = document
      .querySelector('[data-wapf-price]:checked + .wapf-label-text')
      ?.textContent.match(/\d+g/gu)?.[0];
    const weightElementValue = document
      .querySelector('.woocommerce-product-attributes-item--weight .woocommerce-product-attributes-item__value')
      ?.textContent.replace(' g', '');
    const weightDescription = Array.from(document.querySelectorAll('#tab-description p'))
      .map((element) => element.textContent)
      .find((text) => text.endsWith('g') || text.match(/\d+g /gu)?.length > 0);
    const weight =
      Number(weightDescription?.slice(0, weightDescription.indexOf('g'))) ||
      (weightSelectionValue && Number(weightSelectionValue.replace('g', ''))) ||
      (weightElementValue && Number(weightElementValue) * 1000) ||
      null;

    if (!weight || isNaN(weight)) {
      logger.error(`No weight found for ${url}`);

      throw new Error(errors.weightMissing);
    }

    const pricePerGram = Number((price / weight).toFixed(2));

    const postTitle = document.querySelector('.wp-block-post-title').textContent.toLowerCase();
    const countryRegionOrFarm = postTitle.includes(' // ') ? postTitle.split(' // ') : postTitle.split(' | ');

    const originCountry =
      originCountries.find(({ name }) => countryRegionOrFarm.some((item) => name === item)) ||
      originCountries.find(({ name }) => url.includes(name));
    const originCountryId = originCountry?.origin_country_id || null;

    if (!originCountryId) {
      logger.error(`No origin country found for ${url}`);

      throw new Error(errors.originCountryMissing);
    }

    const originFarmId = originFarms.find(({ name }) => countryRegionOrFarm.some((item) => name === item))?.id || null;

    const originRegionId =
      originRegions.find(({ name }) => countryRegionOrFarm.some((item) => name === item))?.origin_region_id || null;

    const brewingMethodValues = Array.from(document.querySelectorAll('.wapf-label-text')).map((element) =>
      element.textContent.toLowerCase()
    );
    const isFilter =
      brewingMethodValues.includes('filter') ||
      postTitle.includes('filter') ||
      Array.from(document.querySelectorAll('#tab-description p'))
        .map((element) => element.textContent)
        .find((text) => text.toLocaleLowerCase().includes(' for filter'))?.length > 0;
    const isEspresso = brewingMethodValues.includes('espresso') || postTitle.includes('espresso');
    const brewingMethodId =
      brewingMethods.find(
        ({ name }) =>
          (isFilter && !isEspresso && name === 'filter') ||
          (isEspresso && !isFilter && name === 'espresso') ||
          name === 'omni'
      )?.brewing_method_id || null;

    const image = document.querySelector('noscript [data-testid="product-image"]').src;

    const description = document.querySelector('.wp-block-post-excerpt__excerpt')?.textContent.trim().toLowerCase();
    const processingMethodId =
      processingMethods.find(({ name }) => description.includes(name))?.processing_method_id || null;

    const tasteNotesFound = tasteNotes.filter(({ name }) => description.includes(name));
    // exclude taste notes that include each other like st'raw'berry and 'raw'
    const distinctTasteNotes = tasteNotesFound.filter(
      ({ name }) => !tasteNotesFound.some(({ name: n }) => n !== name && n.includes(name))
    );
    const uniqueTasteNoteIds = Array.from(new Set(distinctTasteNotes.map(({ taste_note_id: id }) => id)));

    const varietiesFound = varieties.filter(
      ({ name, alias }) =>
        description.includes(name.toLowerCase()) || (alias && description.includes(alias.toLowerCase()))
    );
    // exclude varieties that include each other like Ruiru and Ruiru 11
    const distinctVarieties = varietiesFound.filter(
      ({ name }) => !varietiesFound.some(({ name: n }) => n !== name && n.includes(name))
    );
    const uniqueVarietyIds = Array.from(
      new Set(distinctVarieties.filter(({ name }) => name.toLowerCase() !== originCountry).map(({ id }) => id))
    );

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
      tasteNoteIds: uniqueTasteNoteIds,
      varietyIds: uniqueVarietyIds,
      webshopItemLink: url,
      weight
    };
  },
  // Bani Beans
  285: async ({ html, url, roasterId }) => {
    logger.info(`Parsing item page: ${url}`);

    const document = getDocument(html);

    const price = Number(
      document
        .querySelector('.price-item--regular')
        .textContent.trim()
        .replace('€', '')
        .replace(' EUR', '')
        .replace(',', '.')
    ).toFixed(2);

    if (!price || isNaN(price)) {
      logger.error(`No price found for ${url}`);

      throw new Error(errors.priceMissing);
    }

    const currency = 'EUR';

    const weightElement = document.querySelector('variant-radios input[checked]');
    const weight = Number(weightElement?.value.replace('g', ''));

    if (!weight || isNaN(weight)) {
      logger.error(`No weight found for ${url}`);

      throw new Error(errors.weightMissing);
    }

    const pricePerGram = Number((price / weight).toFixed(2));

    const details = Array.from(document.querySelectorAll('.product__description h5')).reduce((_details, row) => {
      if (!row.textContent?.trim()) {
        return _details;
      }

      const keyAndValue = row.textContent.toLowerCase().split(': ');

      if (keyAndValue.length !== 2) {
        return _details;
      }

      const key = keyAndValue[0].trim();
      const value = keyAndValue[1].trim();

      _details[key] = value;

      return _details;
    }, {});

    const originCountry = details.country;
    const originCountryId = originCountries.find(({ name }) => name === originCountry)?.origin_country_id || null;

    if (!originCountryId) {
      logger.error(`No origin country found for ${url}`);

      throw new Error(errors.originCountryMissing);
    }

    const originRegion = details.region;
    const originRegionId =
      originRegions.find(({ name }) => name === originRegion)?.origin_region_id ||
      originRegions.find(({ name }) => originRegion.includes(name))?.origin_region_id ||
      null;

    const brewingMethod = details['recommended preparation'];
    const isFilter = brewingMethod.includes('filter');
    const isEspresso = brewingMethod.includes('espresso');
    const brewingMethodId =
      brewingMethods.find(
        ({ name }) =>
          (isFilter && isEspresso && name === 'omni') ||
          (isFilter && !isEspresso && name === 'filter') ||
          (isEspresso && !isFilter && name === 'espresso')
      )?.brewing_method_id || null;

    const processingMethod = details['process type'];
    const processingMethodId =
      processingMethods.find(({ name }) => name === processingMethod)?.processing_method_id || null;

    const variety = details['botanical variety'];
    const varietyIds = varieties
      .filter(({ name, alias }) => name.toLowerCase() === variety || (alias && alias.toLowerCase() === variety))
      .map(({ id }) => id);

    const tasteNotesString = details['coffee notes'];
    const tasteNoteIds = tasteNotes
      .filter(({ name }) => tasteNotesString.includes(name))
      .map(({ taste_note_id: id }) => id);

    const image = document.querySelector('.product__media img')?.src;

    return {
      brewingMethodId,
      currency,
      image: image ? `${new URL(url).protocol}${image}` : null,
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
  },
  // Stow
  286: async ({ html, url, roasterId }) => {
    logger.info(`Parsing item page: ${url}`);

    const document = getDocument(html);

    const variationsData = document.querySelector('.variations_form')?.dataset?.product_variations;
    const variations = variationsData
      ? JSON.parse(variationsData).sort((a, b) =>
          a.weight && b.weight
            ? Number(a.weight) - Number(b.weight)
            : Number(a.attributes?.attribute_pa_teza?.replace('-grams', '')) -
              Number(b.attributes?.attribute_pa_teza?.replace('-grams', ''))
        )
      : undefined;
    const productDetails = variations?.[0];

    const price =
      productDetails?.display_price ||
      Number(
        document.querySelector('.woocommerce-Price-amount').textContent.trim().replace(' €', '').replace(',', '.')
      ).toFixed(2);

    if (!price || isNaN(price)) {
      logger.error(`No price found for ${url}`);

      throw new Error(errors.priceMissing);
    }

    const currency = 'EUR';

    let weight = productDetails
      ? Number(productDetails.weight || productDetails.attributes?.attribute_pa_teza?.replace('-grams', ''))
      : Number(
          Array.from(document.querySelector('section .block').querySelectorAll('p'))
            .filter(
              ({ textContent }) => textContent.includes('Teža') || textContent.toLowerCase().includes('weight')
            )[0]
            ?.textContent.toLowerCase()
            .match(/(weight|teža): \d*g/giu)[0]
            .replace('weight: ', '')
            .replace('teža: ', '')
            .replace('g', '')
        );

    if (!weight || isNaN(weight)) {
      weight = 250; // we assume 250g
    }

    const pricePerGram = Number((price / weight).toFixed(2));

    const originDetails = Array.from(document.querySelectorAll('.shop-single-info .is-offset-2 .block h5')).reduce(
      (_details, element) => {
        const key = element.textContent.toLowerCase().trim();
        const value = element.nextElementSibling.textContent.toLowerCase().trim();

        if (key === 'country' || key === 'estate') {
          _details[key] = value;
        }

        return _details;
      },
      {}
    );

    const originCountry = originDetails.country;

    if (originCountry.includes(' / ')) {
      return { isBlend: true };
    }

    const originCountryId = originCountries.find(({ name }) => name === originCountry)?.origin_country_id || null;

    if (!originCountryId) {
      logger.error(`No origin country found for ${url}`);

      throw new Error(errors.originCountryMissing);
    }

    const originFarm = originDetails.estate;
    const title = document.querySelector('h4.title')?.textContent.trim().toLowerCase();
    const foundOriginFarm = originFarms.find(({ name }) => name === originFarm || name === title);
    const originFarmId = foundOriginFarm?.id || null;

    if (originFarm && !originFarmId) {
      logger.info(`Missing origin farm: ${originFarm}`);
    }

    const originRegionId = foundOriginFarm ? foundOriginFarm.origin_region_id : null;

    const tasteNotesElement = document.querySelector('.shop-single-details .is-offset-1 h5.title + p');
    const tasteNotesStrings = tasteNotesElement?.textContent.toLowerCase().trim().split(', ');
    const tasteNoteIds = tasteNotesStrings
      .filter((note) => tasteNotes.find(({ name }) => name === note))
      .map((note) => tasteNotes.find(({ name }) => name === note).taste_note_id);
    const missingTasteNotes = tasteNotesStrings.filter((note) => !tasteNotes.find(({ name }) => name === note));

    if (missingTasteNotes.length) {
      logger.info(`Missing taste notes: ${missingTasteNotes.join(', ')}`);
    }

    const subtitle = document.querySelector('h6').textContent.toLowerCase().trim();

    const varietyIds = varieties
      .filter(
        ({ name, alias }) => subtitle.includes(name.toLowerCase()) || (alias && subtitle.includes(alias.toLowerCase()))
      )
      .map(({ id }) => id);

    const processingMethodId =
      processingMethods.filter(({ name }) => subtitle.includes(name)).sort((a, b) => b.name.length - a.name.length)?.[0]
        ?.processing_method_id || null;

    const isEspresso = Boolean(document.querySelector('[data-target="modal-ESPRESSO"]'));
    const isFilter =
      Boolean(document.querySelector('[data-target="modal-V60"]')) ||
      Boolean(document.querySelector('[data-target="modal-CHEMEX"]'));
    const brewingMethodId =
      brewingMethods.find(
        ({ name }) =>
          (isEspresso && isFilter && name === 'omni') ||
          (isFilter && !isEspresso && name === 'filter') ||
          (isEspresso && !isFilter && name === 'espresso')
      )?.brewing_method_id || null;

    if (!brewingMethodId) {
      logger.info(`Missing brewing method`);
    }

    const isDecaf = url.includes('decaf') || subtitle.includes('decaf');

    const image = document.querySelector('.swiper-wrapper img')?.src;

    return {
      brewingMethodId,
      currency,
      image,
      isDecaf,
      originCountryId,
      originRegionId,
      originFarmId,
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
  // kava family
  287: async ({ html, url, roasterId }) => {
    logger.info(`Parsing item page: ${url}`);

    const document = getDocument(html);

    const price = cleanPrice({ priceElement: document.querySelector('.product__price--original') });

    if (!price || isNaN(price)) {
      logger.error(`No price found for ${url}`);

      throw new Error(errors.priceMissing);
    }

    const weight =
      Number(
        Array.from(document.querySelectorAll('.product__description p'))
          .filter(({ textContent }) => textContent.toLowerCase().includes('weight'))[0]
          ?.textContent.toLowerCase()
          .replace('weight:', '')
          .match(/\d+g/giu)[0]
          .replace('g', '')
      ) || 250;

    if (!weight || isNaN(weight)) {
      logger.error(`No weight found for ${url}`);

      throw new Error(errors.weightMissing);
    }

    const pricePerGram = Number((price / weight).toFixed(2));

    const originCountry = document.querySelector('.product__title').textContent.toLowerCase();
    const originCountryId = originCountries.find(({ name }) => originCountry.includes(name))?.origin_country_id || null;

    if (!originCountryId) {
      logger.error(`No origin country found for ${url}`);

      throw new Error(errors.originCountryMissing);
    }

    const details = Array.from(
      document.querySelectorAll('.product__description p b, .product__description p strong')
    ).reduce((_details, row) => {
      const key = row.textContent.toLowerCase().trim().replace(':', '');

      if (!row.nextSibling) {
        return _details;
      }

      const valueElement = row.nextSibling.tagName === 'B' ? row.nextSibling.nextSibling : row.nextSibling;
      const value = valueElement.textContent.toLowerCase().trim();

      _details[key] = value;

      return _details;
    }, {});

    const processingMethodId =
      processingMethods.find(({ name }) => name === details.process) ||
      processingMethods.find(({ name }) => details.process.includes(name))?.processing_method_id ||
      null;

    if (!processingMethodId) {
      logger.debug(errors.processingMethodMissing, ': ', details.process);
    }

    const originRegionId = originRegions.find(({ name }) => name === details.region)?.origin_region_id || null;

    if (!originRegionId) {
      logger.debug(errors.originRegionMissing, ': ', details.region);
    }

    const originFarmId = originFarms.find(({ name }) => details.producer?.includes(name))?.id || null;

    const varietyIds = varieties
      .filter(
        ({ name, alias }) =>
          details.variety.includes(name.toLowerCase()) || (alias && details.variety.includes(alias.toLowerCase()))
      )
      .map(({ id }) => id);
    const missingVarieties = details.variety
      .split(', ')
      .filter(
        (name) =>
          !varieties.map((variety) => variety.name.toLowerCase()).includes(name) &&
          !varieties.map((variety) => variety.alias?.toLowerCase()).includes(name)
      );

    if (missingVarieties.length) {
      logger.debug(`Missing varieties: ${missingVarieties}`);
    }

    const tasteNoteStrings = (details.notes || details['taste notes']).split(', ');
    const tasteNoteIds = tasteNoteStrings
      .filter((note) => tasteNotes.find(({ name }) => name === note))
      .map((note) => tasteNotes.find(({ name }) => name === note).taste_note_id);
    const missingTasteNotes = tasteNoteStrings.filter((note) => !tasteNotes.find(({ name }) => name === note));

    if (missingTasteNotes.length) {
      logger.debug(`Missing taste notes: ${missingTasteNotes.join(', ')}`);
    }

    const variants = Array.from(document.querySelectorAll('#productSelect option')).map(({ textContent }) =>
      textContent.trim().toLowerCase()
    );
    const isEspresso = variants.some((name) => name.includes('espresso'));
    const isFilter = variants.some((name) => name.includes('filter'));
    const brewingMethodId =
      brewingMethods.find(
        ({ name }) =>
          (((isFilter && isEspresso) || variants.length === 1) && name === 'omni') ||
          (isEspresso && !isFilter && name === 'espresso') ||
          (!isEspresso && isFilter && name === 'filter')
      )?.brewing_method_id || null;

    if (!brewingMethodId) {
      logger.debug(errors.brewingMethodMissing);
      logger.debug(variants);
    }

    const image = document.querySelector('.product__gallery img')?.src;

    if (!image) {
      logger.error(`No image found for ${url}`);

      throw new Error(errors.imageMissing);
    }

    return {
      brewingMethodId,
      currency: 'EUR',
      image: `${new URL(url).protocol}${image}`,
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
  // nordbeans
  288: async ({ html, url, roasterId }) => {
    logger.info(`Parsing item page: ${url}`);

    const document = getDocument(html);

    const title = document.querySelector('h1').textContent.toLowerCase().trim();

    if (title.includes('capsules')) {
      return { isCapsule: true };
    }

    const currencySymbol = 'Kč';
    const price = cleanPrice({ priceElement: document.querySelector('.price'), currencySymbol });

    if (!price || isNaN(price)) {
      logger.error(`No price found for ${url}`);

      throw new Error(errors.priceMissing);
    }

    const currency = currencyCodes[currencySymbol.toLowerCase()];

    const weight = Number(document.querySelector('.product-variations option').textContent.trim().replace('g', ''));

    if (!weight || isNaN(weight)) {
      logger.error(`No weight found for ${url}`);

      throw new Error(errors.weightMissing);
    }

    const pricePerGram = Number((price / weight).toFixed(2));

    const details = Array.from(document.querySelectorAll('.product-params ul li strong')).reduce((_details, row) => {
      const key = row.textContent.toLowerCase().trim();

      if (!row.nextSibling) {
        return _details;
      }

      const valueElement = row.nextElementSibling;

      if (!row.nextElementSibling) {
        return _details;
      }

      const value = valueElement.textContent.toLowerCase().trim().replace(/\s+/giu, ' ');

      _details[key] = value;

      return _details;
    }, {});

    const originCountry = details.origin;

    if (originCountry?.includes('/')) {
      logger.info(`Multiple origin countries, so we don't store it`);

      return {};
    }

    const originCountryId =
      originCountries.find(({ name }) => originCountry?.includes(name) || url.toLowerCase().includes(name))
        ?.origin_country_id || null;

    if (!originCountryId) {
      logger.error(`No origin country found for ${url}`);

      throw new Error(errors.originCountryMissing);
    }

    const originRegionId = originRegions.find(({ name }) => name === details.region)?.origin_region_id || null;

    if (!originRegionId) {
      logger.debug(errors.originRegionMissing);
      logger.debug(details.region);
    }

    const originFarmId = originFarms.find(({ name }) => details.farm?.includes(name))?.id || null;

    const processingMethodId =
      processingMethods.find(({ name }) => name === details.processing)?.processing_method_id ||
      processingMethods.find(({ name }) => details.processing.includes(name))?.processing_method_id ||
      null;

    if (!processingMethodId) {
      logger.debug(errors.processingMethodMissing, ': ', details.processing);
    }

    const detailsVarieties = details.variety?.replace('paraneima', 'parainema') || details.localities || ''; // typo
    const varietyIds = varieties
      .filter(
        ({ name, alias }) =>
          detailsVarieties.includes(name.toLowerCase()) || (alias && detailsVarieties.includes(alias.toLowerCase()))
      )
      .map(({ id }) => id);
    const missingVarieties = detailsVarieties
      .split(', ')
      .filter(
        (name) =>
          !varieties.map((variety) => variety.name.toLowerCase()).includes(name) &&
          !varieties.map((variety) => variety.alias?.toLowerCase()).includes(name)
      );

    if (missingVarieties.length) {
      logger.debug(`Missing varieties: ${missingVarieties}`);
    }

    const tasteNoteStrings = details.taste.split(', ');
    const tasteNoteIds = tasteNoteStrings
      .filter((note) => tasteNotes.find(({ name }) => name === note))
      .map((note) => tasteNotes.find(({ name }) => name === note).taste_note_id);
    const missingTasteNotes = tasteNoteStrings.filter((note) => !tasteNotes.find(({ name }) => name === note));

    if (missingTasteNotes.length) {
      logger.debug(`Missing taste notes: ${missingTasteNotes.join(', ')}`);
    }

    const isEspresso =
      details.preparation.includes('espresso') || details.preparation.includes('automatic coffee machine');
    const isFilter = details.preparation.includes('filter') || details.preparation.includes('aeropress');
    const brewingMethodId =
      brewingMethods.find(
        ({ name }) =>
          (isFilter && isEspresso && name === 'omni') ||
          (isEspresso && !isFilter && name === 'espresso') ||
          (!isEspresso && isFilter && name === 'filter')
      )?.brewing_method_id || null;

    if (!brewingMethodId) {
      logger.debug(errors.brewingMethodMissing);
    }

    const roastingLevelId =
      roastingLevels.find(({ name }) => details['degree of roasting']?.toLowerCase().includes(name))
        ?.roasting_level_id || null;

    const image = document.querySelector('.gallery-item img')?.src;

    if (!image) {
      logger.error(`No image found for ${url}`);

      throw new Error(errors.imageMissing);
    }

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
      roastingLevelId,
      tasteNoteIds,
      varietyIds,
      webshopItemLink: url,
      weight
    };
  },
  // roast grind brew
  290: async ({ html, url, roasterId }) => {
    logger.info(`Parsing item page: ${url}`);

    const document = getDocument(html);

    const details = document.querySelector('h1').textContent.toLowerCase().trim();

    if (!details) {
      logger.error(`No details found for ${url}`);

      throw new Error(errors.detailsMissing);
    }

    const currencySymbol = 'zł';
    const price = cleanPrice({
      priceElement: document.querySelector('product-price [ref="priceContainer"] .price'),
      currencySymbol
    });

    if (!price || isNaN(price)) {
      logger.error(`No price found for ${url}`);

      throw new Error(errors.priceMissing);
    }

    const currency = currencyCodes[currencySymbol];

    const weight = details.includes('250g') ? 250 : undefined;

    if (!weight || isNaN(weight)) {
      logger.error(`No weight found for ${url}`);

      throw new Error(errors.weightMissing);
    }

    const pricePerGram = Number((price / weight).toFixed(2));

    const originCountryId = originCountries.find(({ name }) => details.includes(name))?.origin_country_id || null;

    if (!originCountryId) {
      logger.error(`No origin country found for ${url}`);

      throw new Error(errors.originCountryMissing);
    }

    const brewingMethodId =
      brewingMethods.find(({ name }) => details.includes(name))?.brewing_method_id ||
      brewingMethods.find(({ name }) => name === 'filter')?.brewing_method_id ||
      null;

    const originRegionId = originRegions.find(({ name }) => details.includes(name))?.origin_region_id || null;
    const originFarmId = originFarms.find(({ name }) => details.includes(name))?.id || null;

    const processingMethodId =
      processingMethods.find(({ name }) => details.includes(name))?.processing_method_id || null;

    const tasteNotesElement = document.querySelector('rte-formatter.text-block').textContent.trim().toLowerCase();
    const tasteNoteIds = Array.from(
      new Set(tasteNotes.filter(({ name }) => tasteNotesElement.includes(name)).map(({ taste_note_id: id }) => id))
    );

    const image = `https:${document.querySelector('.product-media__image')?.src}`;

    if (!image) {
      logger.error(`No image found for ${url}`);

      throw new Error(errors.imageMissing);
    }

    const isDecaf = url.includes('decaf');

    return {
      brewingMethodId,
      currency,
      image,
      isDecaf,
      originCountryId,
      originFarmId,
      originRegionId,
      price,
      pricePerGram,
      processingMethodId,
      roasterId,
      tasteNoteIds,
      webshopItemLink: url,
      weight
    };
  },
  // Teso
  291: async ({ html, url, roasterId }) => {
    logger.info(`Parsing item page: ${url}`);

    const document = getDocument(html);

    const details = JSON.parse(document.querySelector('[data-product]').dataset.product);

    if (!details) {
      logger.error(`No details found for ${url}`);

      throw new Error(errors.detailsMissing);
    }

    const price = details.price.raw;

    if (!price || isNaN(price)) {
      logger.error(`No price found for ${url}`);

      throw new Error(errors.priceMissing);
    }

    const currency = currencyCodes['zł'];

    const weight = 250;

    if (!weight || isNaN(weight)) {
      logger.error(`No weight found for ${url}`);

      throw new Error(errors.weightMissing);
    }

    const pricePerGram = Number((price / weight).toFixed(2));

    const originCountry = details.fields.country.toLowerCase();
    const originCountryId = originCountries.find(({ name }) => originCountry.includes(name))?.origin_country_id || null;

    if (!originCountryId) {
      logger.error(`No origin country found for ${url}`);

      throw new Error(errors.originCountryMissing);
    }

    const originRegionId =
      originRegions.find(({ name }) => name === details.fields.region.toLowerCase())?.origin_region_id || null;

    if (!originRegionId) {
      logger.debug(errors.originRegionMissing);
      logger.debug(details.fields.region);
    }

    const processingMethodId =
      processingMethods.find(({ name }) => name === details.fields.process.toLowerCase())?.processing_method_id ||
      processingMethods.find(({ name }) => details.fields.process.toLowerCase().includes(name))?.processing_method_id ||
      null;

    if (!processingMethodId) {
      logger.debug(errors.processingMethodMissing, ': ', details.fields.process);
    }

    const varietiesStrings = details.fields.varietal.toLowerCase().replace('741112', '74112').split(', '); // 741112 is a typo
    const varietyIds = varieties
      .filter(
        ({ name, alias }) =>
          varietiesStrings.includes(name.toLowerCase()) || (alias && varietiesStrings.includes(alias.toLowerCase()))
      )
      .map(({ id }) => id);
    const missingVarieties = varietiesStrings.filter(
      (name) =>
        !varieties.map((variety) => variety.name.toLowerCase()).includes(name) &&
        !varieties.map((variety) => variety.alias?.toLowerCase()).includes(name)
    );

    if (missingVarieties.length) {
      logger.debug(`Missing varieties: ${missingVarieties}`);
    }

    const tasteNoteStrings = details.fields.tasting_notes.split(', ');
    const tasteNoteIds = tasteNoteStrings
      .filter((note) => tasteNotes.find(({ name }) => name === note))
      .map((note) => tasteNotes.find(({ name }) => name === note).taste_note_id);
    const missingTasteNotes = tasteNoteStrings.filter((note) => !tasteNotes.find(({ name }) => name === note));

    if (missingTasteNotes.length) {
      logger.debug(`Missing taste notes: ${missingTasteNotes.join(', ')}`);
    }

    const isEspresso = details.category.slug.includes('espresso') || details.category.slug.includes('omniroast');
    const isFilter = details.category.slug.includes('filtr') || details.category.slug.includes('omniroast');
    const brewingMethodId =
      brewingMethods.find(
        ({ name }) =>
          (isFilter && isEspresso && name === 'omni') ||
          (isEspresso && !isFilter && name === 'espresso') ||
          (!isEspresso && isFilter && name === 'filter')
      )?.brewing_method_id || null;

    if (!brewingMethodId) {
      logger.debug(errors.brewingMethodMissing);
    }

    const image = details.image.full;

    if (!image) {
      logger.error(`No image found for ${url}`);

      throw new Error(errors.imageMissing);
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
