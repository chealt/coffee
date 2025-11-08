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

const errors = {
  priceMissing: 'Missing price',
  weightMissing: 'Missing weight',
  currencyMissing: 'Missing currency'
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
      .filter(({ name }) => name.toLowerCase() !== originCountry)
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
      .filter(({ name }) => name.toLowerCase() !== originCountry)
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
      .filter(({ name }) => name.toLowerCase() !== originCountry)
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
      .filter(({ name }) => name.toLowerCase() !== originCountry)
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
  },
  // Klaro
  70: async ({ html, url, roasterId }) => {
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

    const weightElementValue = document
      .querySelector('.woocommerce-product-attributes-item--weight td')
      .textContent.replaceAll(' kg', '')
      .replaceAll(',', '.');
    const weight = parseFloat(weightElementValue) * 1000; // convert to grams

    const pricePerGram = Number((price / weight).toFixed(2));

    const originCountry = originCountries.find(({ name }) => url.replaceAll('-', ' ').includes(name));
    const originCountryId = originCountry?.origin_country_id;

    const originRegion = document
      .querySelector('.woocommerce-product-attributes-item--attribute_region td')
      .textContent.toLowerCase();
    const originRegionId = originRegions.find(({ name }) => originRegion.includes(name))?.origin_region_id || null;

    if (!originRegionId) {
      console.debug(`Missing origin region: ${originRegion.textContent}`);
    }

    const processingMethod = document
      .querySelector('.woocommerce-product-attributes-item--attribute_process td')
      .textContent.trim()
      .toLowerCase();
    const processingMethodId = processingMethods.find(({ name }) => name === processingMethod)?.processing_method_id;

    if (!processingMethodId) {
      console.debug(`Missing processing method: ${processingMethod}`);
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
      console.debug(`Missing taste notes: ${missingTasteNotes.join(', ')}`);
    }

    const varietiesStrings = document
      .querySelector('.woocommerce-product-attributes-item--attribute_variety td')
      .textContent.trim()
      .toLowerCase()
      .split(', ');
    const varietyIds = varieties
      .filter(
        ({ name }) =>
          varietiesStrings.includes(name.toLowerCase()) ||
          (name.toLowerCase() === 'mundo novo' && varietiesStrings.includes('mundo movo')) // typo
      )
      .filter(({ name }) => name.toLowerCase() !== originCountry)
      .map(({ id }) => id);
    const missingVarieties = varietiesStrings.filter(
      (variety) =>
        !varieties.some(
          ({ name }) =>
            name.toLowerCase() === variety || (name.toLowerCase() === 'mundo novo' && variety === 'mundo movo')
        )
    );

    if (missingVarieties.length) {
      console.debug(`Missing varieties: ${missingVarieties.join(', ')}`);
    }

    const isDecaf = url.includes('decaf');

    const image = document.querySelector('img.wp-post-image').src;

    if (!image) {
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
    console.info(`Parsing item page: ${url}`);
    const document = getDocument(html);

    const price = parseFloat(document.querySelector('.price-item').textContent.replaceAll(' €', ''));

    const currencySymbol = document.querySelector('.price-item').textContent.includes('€') ? '€' : undefined;
    const currency = currencyCodes[currencySymbol];

    if (!currency) {
      throw new Error(`Unknown currency: ${url}`);
    }

    const weightElementValue =
      document.querySelector('.metafield-number_integer')?.textContent ||
      document.querySelector('[name=Packaging]:checked')?.value.replace('g', '') ||
      document.querySelector('[name=balenie]:checked')?.value.replace('g', '');
    const weight = parseFloat(weightElementValue);

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
    const originCountryTranslated = await translate({ text: originCountry, from: 'cs', to: 'en' });
    const originCountryId =
      originCountries.find(({ name }) => name === originCountry)?.origin_country_id ||
      originCountries.find(({ name }) => name === originCountryTranslated)?.origin_country_id ||
      null;

    if (!originCountryId) {
      console.log(details);
      console.info(`Missing origin country: ${originCountry}`);
    }

    const processingMethod = (await translate({ text: details.spracovanie, from: 'cs', to: 'en' }))
      .trim()
      .toLowerCase();
    const processingMethodId =
      processingMethods.find(({ name }) => name.toLowerCase() === details.spracovanie)?.processing_method_id ||
      processingMethods.find(({ name }) => name.toLowerCase() === processingMethod)?.processing_method_id ||
      processingMethods.find(({ name }) => processingMethod.includes(name.toLowerCase()))?.processing_method_id;

    if (!processingMethodId) {
      console.debug(`Missing processing method: ${processingMethod} for ${url}`);
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
      console.debug(`No taste notes: ${cleanTranslation}, at ${url}`);
    }

    const isDecaf = url.includes('decaf');

    const imageSrc = document.querySelector('img.global-media-settings')?.src;

    if (!imageSrc) {
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
    console.info(`Parsing item page: ${url}`);
    const document = getDocument(html);

    const price = parseFloat(
      document.querySelector('.price .woocommerce-Price-amount.amount').textContent.replaceAll(' €', '')
    );

    const currencySymbol = document.querySelector('.summary .price .woocommerce-Price-currencySymbol').textContent;
    const currency = currencyCodes[currencySymbol];

    if (!currency) {
      throw new Error(`Unknown currency: ${url}`);
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

    if (!details.volume) {
      console.error(`No weight found at: ${url}`);

      return {};
    }

    const weight = Number(details.volume.replace(' gr', ''));

    const pricePerGram = Number((price / weight).toFixed(2));

    const originCountry = originCountries.find(
      ({ name }) => name === details['country of origin'] || url.includes(name)
    );
    const originCountryId = originCountry?.origin_country_id || null;

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
    const varietiesFound = varieties.filter(({ name }) => description.includes(name.toLowerCase()));
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
    console.info(`Parsing item page: ${url}`);

    const document = getDocument(html);

    const price = parseFloat(
      document
        .querySelector('.price.nasa-single-product-price .woocommerce-Price-amount')
        .textContent.replaceAll('€ ', '')
    );

    const currencySymbol = document.querySelector('.woocommerce-Price-currencySymbol').textContent;
    const currency = currencyCodes[currencySymbol];

    if (!currency) {
      throw new Error(`Unknown currency: ${currencySymbol}`);
    }

    const weightElement = document.querySelector('div[data-attribute_name="attribute_pa_vaha"] .nasa-attr-text');

    if (!weightElement) {
      console.error(`No weight found at: ${url}`);

      return {};
    }

    const weight = Number(weightElement.textContent.replace('g', ''));

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
      console.error(`No details found at: ${url}`);

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
      console.debug(url, ': ', details);
    }

    const missingTasteNotes = tasteNotesString
      ?.split(', ')
      .filter((note) => !tasteNotes.some(({ name }) => name === note.trim().toLowerCase()));

    if (missingTasteNotes.length) {
      console.info(`Missing taste notes: ${missingTasteNotes.join(', ')}`);
    }

    const varietiesString = details.variety || details.varietal;
    const varietiesStrings = varietiesString.includes(', ') ? varietiesString.split(', ') : [varietiesString];
    const varietyIds = varieties
      .filter(({ name }) => varietiesStrings.includes(name.toLowerCase()))
      .filter(({ name }) => name.toLowerCase() !== originCountry)
      .map(({ id }) => id);

    if (!varietyIds.length) {
      console.info(`Missing varieties: ${varietiesStrings}`);
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
    console.info(`Parsing item page: ${url}`);

    const document = getDocument(html);

    const optionsPrice = document
      .querySelector('.wapf-checked .wapf-pricing-hint')
      ?.textContent.replace('(+', '')
      .replace('zł)', '')
      .trim();
    const priceAmount = document.querySelector('.woocommerce-Price-amount')?.textContent;

    const price = parseFloat(priceAmount) + (optionsPrice ? parseFloat(optionsPrice) : 0);
    const currencySymbol = document.querySelector('.woocommerce-Price-currencySymbol').textContent;
    const currency = currencyCodes[currencySymbol];

    if (!currency) {
      throw new Error(`Unknown currency: ${url}`);
    }

    if (!price) {
      throw new Error(`Unknown price: ${url}`);
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

    if (!weight) {
      console.error(`Could not find weight for product: ${url}`);

      return {};
    }

    const pricePerGram = Number((price / weight).toFixed(2));

    const postTitle = document.querySelector('.wp-block-post-title').textContent.toLowerCase();
    const countryRegionOrFarm = postTitle.includes(' // ') ? postTitle.split(' // ') : postTitle.split(' | ');

    const originCountry =
      originCountries.find(({ name }) => countryRegionOrFarm.some((item) => name === item)) ||
      originCountries.find(({ name }) => url.includes(name));
    const originCountryId = originCountry?.origin_country_id || null;

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

    const varietiesFound = varieties.filter(({ name }) => description.includes(name.toLowerCase()));
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
    console.info(`Parsing item page: ${url}`);

    const document = getDocument(html);

    const price = parseFloat(
      document.querySelector('.price-item--regular').textContent.trim().replace('€', '').replace(' EUR', '')
    );

    if (!price || isNaN(price)) {
      throw new Error(errors.priceMissing);
    }

    const currency = 'EUR';
    const weightElement = document.querySelector('variant-radios input[checked]');
    const weight = Number(weightElement?.value.replace('g', ''));

    if (!weight || isNaN(weight)) {
      console.error('weight element: ', weightElement);
      console.error('weight value: ', weightElement?.value);

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
    const varietyIds = varieties.filter(({ name }) => name.toLowerCase() === variety).map(({ id }) => id);

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
  }
};

export default parsers;
