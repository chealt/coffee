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

const getWindow = (html) => {
  const { window } = new JSDOM(html);

  return window;
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

// Parsers ordered by roaster ID
const parsers = {
  // Prolog
  1: ({ html, url, roasterId }) => {
    logger.info(`Parsing item page: ${url}`);

    const document = getDocument(html);

    const productScript = Array.from(document.querySelectorAll('script[type="application/json"]')).find((script) =>
      script.textContent.includes('"product":')
    );

    if (!productScript) {
      logger.error(`No product data found for ${url}`);

      throw new Error(errors.detailsMissing);
    }

    const { product } = JSON.parse(productScript.textContent);

    const availableVariants = product.variants.filter((variant) => variant.available);

    if (!availableVariants.length) {
      return { isOutOfStock: true };
    }

    const parseVariantWeight = (title) => {
      const match = title.match(/(\d+)\s*(g|kg)/i);

      if (!match) {
        return undefined;
      }

      const num = Number(match[1]);

      return match[2].toLowerCase() === 'kg' ? num * 1000 : num;
    };

    const sortedVariants = [...availableVariants].sort(
      (a, b) => parseVariantWeight(a.title) - parseVariantWeight(b.title)
    );
    const smallestVariant = sortedVariants[0];

    const price = Number((smallestVariant.price / 100).toFixed(2));
    const weight = parseVariantWeight(smallestVariant.title);

    if (!price || isNaN(price)) {
      logger.error(`No price found for ${url}`);

      throw new Error(errors.priceMissing);
    }

    if (!weight || isNaN(weight)) {
      logger.error(`No weight found for ${url}`);

      throw new Error(errors.weightMissing);
    }

    const pricePerGram = Number((price / weight).toFixed(2));

    const ldScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    const productLd = ldScripts
      .map((script) => {
        try {
          return JSON.parse(script.textContent);
        } catch {
          return null;
        }
      })
      .find((data) => data?.['@type'] === 'Product');

    const currency = productLd?.offers?.priceCurrency || productLd?.offers?.[0]?.priceCurrency;

    if (!currency) {
      logger.error(`No currency found for ${url}`);

      throw new Error(errors.currencyMissing);
    }

    const image = product.featured_image ? `https:${product.featured_image}` : null;

    if (!image) {
      logger.error(`No image found for ${url}`);

      throw new Error(errors.imageMissing);
    }

    const descriptionDocument = getDocument(product.description || '');
    const specs = {};

    descriptionDocument.querySelectorAll('table tr').forEach((row) => {
      const cells = row.querySelectorAll('td');

      if (cells.length >= 2) {
        const key = cells[0].textContent.trim().toLowerCase();
        // Normalize curly apostrophes so values match data dictionaries (e.g. "murang’a" → "murang'a")
        const value = cells[1].textContent
          .trim()
          .toLowerCase()
          .replace(/[‘’]/g, "'");

        if (key && value) {
          specs[key] = value;
        }
      }
    });

    const countryText = specs.country || product.vendor?.toLowerCase() || '';
    const originCountryId = originCountries.find(({ name }) => name === countryText)?.origin_country_id || null;

    if (!originCountryId) {
      logger.error(`No origin country found for ${url}`);

      throw new Error(errors.originCountryMissing);
    }

    const regionText = specs.region || '';
    const originRegionId = originRegions.find(({ name }) => regionText.includes(name))?.origin_region_id || null;

    if (!originRegionId) {
      logger.info(`Missing origin region: ${regionText}`);
    }

    const farmerText = specs.farmer || specs.producer || '';
    const originFarmId =
      originFarms.find(({ name }) => farmerText.includes(name))?.id ||
      originFarms.find(({ name }) => product.title.toLowerCase().includes(name))?.id ||
      null;

    const processingText = specs.process || '';
    const sortedProcessingMethods = [...processingMethods].sort((a, b) => b.name.length - a.name.length);
    const processingMethodId =
      sortedProcessingMethods.find(({ name }) => processingText === name)?.processing_method_id ||
      sortedProcessingMethods.find(({ name }) => processingText.includes(name))?.processing_method_id ||
      null;

    if (!processingMethodId) {
      logger.info(`Missing processing method: ${processingText}`);
    }

    const varietyText = specs.variety || '';
    const varietyStrings = varietyText
      .split(/[,/&+]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const varietyIds = Array.from(
      new Set(
        varieties
          .filter(({ name, alias }) =>
            varietyStrings.some(
              (s) =>
                name.toLowerCase() === s ||
                (alias && alias.toLowerCase() === s) ||
                s.includes(name.toLowerCase()) ||
                (alias && s.includes(alias.toLowerCase()))
            )
          )
          .map(({ id }) => id)
      )
    );

    if (!varietyIds.length) {
      logger.info(`Missing varieties: ${varietyStrings}`);
    }

    const brewingMethodId = brewingMethods.find(({ name }) => name === 'omni')?.brewing_method_id || null;

    const tasteNotesText = specs['tasting notes'] || specs['flavour notes'] || specs['flavor notes'] || '';
    const tasteNoteStrings = tasteNotesText
      .split(/[,&]/)
      .map((s) => s.trim().replace(/\.$/, ''))
      .filter(Boolean);
    const tasteNoteIds = Array.from(
      new Set(
        tasteNoteStrings
          .map(
            (note) =>
              tasteNotes.find(({ name }) => name === note)?.taste_note_id ||
              tasteNotes.find(({ name }) => note.includes(name))?.taste_note_id
          )
          .filter(Boolean)
      )
    );

    if (!tasteNoteIds.length) {
      logger.info(`Missing taste notes: ${tasteNoteStrings}`);
    }

    const isDecaf = url.includes('decaf') || product.title.toLowerCase().includes('decaf');

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
  // Sheep & Raven
  6: ({ html, url, roasterId }) => {
    logger.info(`Parsing webshop item page ${url}`);

    const document = getDocument(html);

    const title = document.querySelector('h1.product-title').textContent.toLowerCase().trim();

    const options = document.querySelectorAll('#pa_opakowanie option');
    const isOutOfStock = options.length === 1 && options[0].textContent.toLowerCase().includes('choose an option');

    if (isOutOfStock) {
      logger.info(`Out of stock for ${url}`);

      return { isOutOfStock: true };
    }

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
    const originFarmId =
      originFarms.find(({ name }) => regionOrFarm.includes(name))?.id ||
      originFarms.find(({ name }) => title.includes(name))?.id ||
      null;

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

    const collectDetails = (selector) =>
      Array.from(document.querySelectorAll(selector)).reduce((newDetails, nameElement) => {
        const name = nameElement.textContent.toLowerCase().trim();
        const value = nameElement.nextElementSibling?.textContent.toLowerCase().trim();

        if (!name || !value) {
          return newDetails;
        }

        return { ...newDetails, [name]: value };
      }, {});

    const details = {
      ...collectDetails('.product-description td:has(strong)'),
      ...collectDetails('.data-sheet dt')
    };

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
      const fullDescription = Array.from(document.querySelectorAll('.product-description'))
        .map((el) => el.textContent.toLowerCase())
        .join(' ');

      if (/\brobust/i.test(fullDescription) || fullDescription.includes('mieszanka')) {
        return { isBlend: true };
      }

      logger.error(`No origin country found for ${url}`);

      throw new Error(errors.originCountryMissing);
    }

    const originRegion = details.region;
    const originRegionId =
      originRegion
        ?.split(/,\s*/)
        .map((part) => originRegions.find(({ name }) => name === part.trim())?.origin_region_id)
        .find(Boolean) || null;

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
      details['odmiana botaniczna']?.split(/,\s*/).map((name) => name.trim().toLocaleLowerCase()) || [];
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
  // La Cabra
  10: async ({ html, url, roasterId }) => {
    logger.info(`Parsing item page: ${url}`);

    const window = getWindow(html);
    const document = window.document;

    const allScripts = Array.from(document.querySelectorAll('script:not([src])'));
    const variantScript = allScripts.find(
      (s) => s.textContent.includes('"available"') && s.textContent.includes('"option1"')
    );

    if (!variantScript) {
      logger.error(`No variant data found for ${url}`);

      throw new Error(errors.detailsMissing);
    }

    const variants = JSON.parse(variantScript.textContent);
    const availableVariants = variants.filter((v) => v.available);

    if (!availableVariants.length) {
      logger.info(`Out of stock for ${url}`);

      return { isOutOfStock: true };
    }

    const smallestVariant = availableVariants.sort((a, b) => a.weight - b.weight)[0];
    const price = Number((smallestVariant.price / 100).toFixed(2));
    const weight = smallestVariant.weight;

    if (!price || isNaN(price)) {
      logger.error(`No price found for ${url}`);

      throw new Error(errors.priceMissing);
    }

    if (!weight || isNaN(weight)) {
      logger.error(`No weight found for ${url}`);

      throw new Error(errors.weightMissing);
    }

    const currency = JSON.parse(
      allScripts.find(({ textContent }) => textContent.includes('http://schema.org/'))?.textContent
    ).offers[0].priceCurrency;
    const pricePerGram = Number((price / weight).toFixed(2));

    const originCountryText = document
      .querySelector('.product__title .product__text')
      ?.textContent.trim()
      .toLowerCase();

    const richTextEls = Array.from(document.querySelectorAll('.metafield-rich_text_field'));
    const uniqueRichTextEls = richTextEls.filter(
      (el, index, arr) => arr.findIndex((e) => e.textContent.trim() === el.textContent.trim()) === index
    );

    const aboutEl = uniqueRichTextEls.find((el) => el.textContent.includes('About'));
    const aboutText = aboutEl?.textContent.toLowerCase() || '';

    const accordionText = Array.from(document.querySelectorAll('.product__accordion p'))
      .map((el) => el.textContent.toLowerCase())
      .join(' ');

    if (aboutText.includes('blend') || accordionText.includes('blend')) {
      return { isBlend: true };
    }

    const originCountryId = originCountries.find(({ name }) => name === originCountryText)?.origin_country_id || null;

    if (!originCountryId) {
      logger.error(`No origin country found for ${url}`);

      throw new Error(errors.originCountryMissing);
    }

    const techDataEl = uniqueRichTextEls.find((el) => el.textContent.includes('Technical Data'));
    const techData = Array.from(techDataEl?.querySelectorAll('strong') || []).reduce((_details, strongEl) => {
      const key = strongEl.textContent.trim().toLowerCase();
      const value = strongEl.nextSibling?.textContent?.trim().toLowerCase();

      if (value) {
        _details[key] = value;
      }

      return _details;
    }, {});

    const originRegionId = originRegions.find(({ name }) => techData.region?.includes(name))?.origin_region_id || null;

    if (!originRegionId) {
      logger.info(`Missing origin region: ${techData.region}`);
    }

    const processingMethodId =
      processingMethods.find(({ name }) => name === techData.process)?.processing_method_id ||
      processingMethods.find(({ name }) => techData.process?.includes(name))?.processing_method_id ||
      null;

    if (!processingMethodId) {
      logger.info(`Missing processing method: ${techData.process}`);
    }

    const varietiesStrings = techData.varietal
      ? techData.varietal
          .split(/[,/&]/)
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    const varietyIds = varieties
      .filter(
        ({ name, alias }) =>
          varietiesStrings.includes(name.toLowerCase()) || (alias && varietiesStrings.includes(alias.toLowerCase()))
      )
      .map(({ id }) => id);

    if (!varietyIds.length) {
      logger.info(`Missing varieties: ${varietiesStrings}`);
    }

    const isFilter = aboutText.includes('filter');
    const isEspresso = aboutText.includes('espresso');
    const brewingMethodId =
      brewingMethods.find(
        ({ name }) =>
          (isFilter && isEspresso && name === 'omni') ||
          (isFilter && !isEspresso && name === 'filter') ||
          (isEspresso && !isFilter && name === 'espresso')
      )?.brewing_method_id || null;

    if (!brewingMethodId) {
      logger.info(`Missing brewing method for ${url}`);
    }

    const tasteNotesFound = tasteNotes.filter(({ name }) => aboutText.includes(name));
    const distinctTasteNotes = tasteNotesFound.filter(
      ({ name }) => !tasteNotesFound.some(({ name: n }) => n !== name && n.includes(name))
    );
    const tasteNoteIds = distinctTasteNotes.map(({ taste_note_id: id }) => id);

    const image = document.querySelector('.product__media img')?.src;

    if (!image) {
      logger.error(`No image found for ${url}`);

      throw new Error(errors.imageMissing);
    }

    const isDecaf = url.includes('decaf');

    return {
      brewingMethodId,
      currency,
      image: `https:${image}`,
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
  // Coffee Collective
  11: async ({ html, url, roasterId }) => {
    logger.info(`Parsing item page: ${url}`);

    const document = getDocument(html);

    const description = document.querySelector('.product__description p').textContent.trim().toLowerCase();

    const [priceText, currency] = document
      .querySelector('[name=add]')
      .textContent.replaceAll(/\s+/gi, ' ')
      .replace('Buy', '')
      .trim()
      .split(' ');

    const price = Number(priceText);

    if (!price || isNaN(price)) {
      logger.error(`No price found for ${url}`);

      throw new Error(errors.priceMissing);
    }

    const weight =
      Number(document.querySelector('.product__description').textContent.split('\n').pop().replace(' G', '')) ||
      Number(
        document
          .querySelector('[name="options[Title]"] option')
          .value.match(/\d+\s*g/i)[0]
          .replace('g', '')
      );

    if (!weight || isNaN(weight)) {
      logger.error(`No weight found for ${url}`);

      throw new Error(errors.weightMissing);
    }

    const pricePerGram = Number((price / weight).toFixed(2));

    const details = Array.from(document.querySelectorAll('.about-this-section .tw-flex.tw-border-b')).reduce(
      (acc, current) => {
        const key = current.querySelector('.tw-uppercase').textContent.toLowerCase();
        const value = current.querySelector('.tw-text-right').textContent.toLowerCase();

        acc[key] = value;

        return acc;
      },
      {}
    );

    const originCountryId =
      originCountries.find(({ name }) => name === details.origin)?.origin_country_id ||
      originCountries.find(({ name }) => details.origin.includes(name))?.origin_country_id ||
      originRegions.find(({ name }) => details.origin.includes(name))?.origin_country_id ||
      null;

    if (!originCountryId) {
      logger.error(`No origin country found for ${url}`);

      throw new Error(errors.originCountryMissing);
    }

    const originRegionId = originRegions.find(({ name }) => details.origin.includes(name))?.origin_region_id || null;
    const originFarmId = originFarms.find(({ name }) => details.origin.includes(name))?.id || null;

    const processingMethodId =
      processingMethods.find(({ name }) => name === details.process)?.processing_method_id ||
      processingMethods.find(({ name }) => details.process.includes(name))?.processing_method_id ||
      null;

    const isFilter = details.roast.includes('filter');
    const isEspresso = details.roast.includes('espresso');
    const isOmni = isFilter && isEspresso;

    const brewingMethodId =
      brewingMethods.find(
        ({ name }) =>
          (isOmni && name === 'omni') ||
          (isFilter && !isEspresso && name === 'filter') ||
          (isEspresso && !isFilter && name === 'espresso')
      )?.brewing_method_id || null;

    if (!brewingMethodId) {
      logger.info(`Missing brewing method for ${url}`);
    }

    const varietiesText = details.varieties || '';
    const varietiesStrings = varietiesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const varietyIds = varieties
      .filter(
        ({ name, alias }) =>
          varietiesStrings.includes(name.toLowerCase()) ||
          (alias && varietiesStrings.includes(alias.toLowerCase())) ||
          varietiesStrings.some((v) => v.includes(name.toLowerCase()))
      )
      .map(({ id }) => id);

    if (!varietyIds.length) {
      logger.info(`Missing varieties: ${varietiesStrings}`);
    }

    const tasteNotesStrings = description
      .replaceAll('.', '')
      .slice(description.indexOf('notes of ') + 'notes of'.length)
      .split(/\s*,\s*(?:and\s*)?|\s+and\s+/gi)
      .map((note) => note.trim());
    const tasteNoteIds = tasteNotes
      .filter(({ name }) => tasteNotesStrings.includes(name))
      .map(({ taste_note_id: id }) => id);

    const missingTasteNotes = tasteNotesStrings.filter((note) => !tasteNotes.some(({ name }) => name === note));

    if (missingTasteNotes.length) {
      logger.info(`Missing taste notes: ${missingTasteNotes.join(', ')}`);
    }

    const image = `https:${document.querySelector('.product img').src}`;

    return {
      brewingMethodId,
      currency,
      image,
      isDecaf: false,
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
  // Friedhats
  12: ({ html, url, roasterId }) => {
    logger.info(`Parsing item page: ${url}`);

    const document = getDocument(html);

    const ldJsonScript = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).find((script) =>
      script.textContent.includes('"Product"')
    );

    if (!ldJsonScript) {
      logger.error(`No product JSON-LD found for ${url}`);

      throw new Error(errors.detailsMissing);
    }

    const productData = JSON.parse(ldJsonScript.textContent);
    const productName = productData.name?.toLowerCase() || '';

    if (productName.includes('blend')) {
      return { isBlend: true };
    }

    if (productData.offers?.availability && !productData.offers.availability.includes('InStock')) {
      logger.info(`Out of stock for ${url}`);

      return { isOutOfStock: true };
    }

    const price = Number(productData.offers?.price).toFixed(2);

    if (!price || isNaN(price)) {
      logger.error(`No price found for ${url}`);

      throw new Error(errors.priceMissing);
    }

    const currency = productData.offers?.priceCurrency;

    if (!currency) {
      logger.error(`No currency found for ${url}`);

      throw new Error(errors.currencyMissing);
    }

    const sizeMatch = productData.offers?.url?.match(/Size=(\d+)gr?/iu);
    const weight = sizeMatch ? Number(sizeMatch[1]) : null;

    if (!weight || isNaN(weight)) {
      logger.error(`No weight found for ${url}`);

      throw new Error(errors.weightMissing);
    }

    const pricePerGram = Number((price / weight).toFixed(2));

    const image = Array.isArray(productData.image) ? productData.image[0] : productData.image;

    if (!image) {
      logger.error(`No image found for ${url}`);

      throw new Error(errors.imageMissing);
    }

    const detailKeys = ['variety', 'processing', 'flavour notes', 'producer', 'farm', 'region', 'altitude', 'country'];
    const details = Array.from(document.querySelectorAll('span.uppercase')).reduce((acc, keyEl) => {
      const key = keyEl.textContent.trim().toLowerCase();

      if (!detailKeys.includes(key)) {
        return acc;
      }

      const value = keyEl.nextElementSibling?.textContent.trim().toLowerCase();

      if (value) {
        acc[key] = value;
      }

      return acc;
    }, {});

    const originCountry = details.country;

    if (originCountry?.includes('&') || originCountry?.includes('%')) {
      return { isBlend: true };
    }

    const originCountryId = originCountries.find(({ name }) => name === originCountry)?.origin_country_id || null;

    if (!originCountryId) {
      logger.error(`No origin country found for ${url}`);

      throw new Error(errors.originCountryMissing);
    }

    const originRegion = details.region;
    const originRegionId =
      originRegions.find(({ name }) => name === originRegion)?.origin_region_id ||
      originRegions.find(({ name }) => originRegion?.includes(name))?.origin_region_id ||
      null;

    if (!originRegionId && originRegion) {
      logger.info(`Missing origin region: ${originRegion}`);
    }

    const originFarm = details.farm;
    const originFarmId =
      originFarms.find(({ name }) => name?.toLowerCase() === originFarm)?.id ||
      originFarms.find(({ name }) => originFarm?.includes(name?.toLowerCase()))?.id ||
      null;

    const processingMethod = details.processing;
    const processingMethodId =
      processingMethods.find(({ name }) => name === processingMethod)?.processing_method_id ||
      processingMethods.find(({ name }) => processingMethod?.includes(name))?.processing_method_id ||
      null;

    if (!processingMethodId) {
      logger.info(`Missing processing method: ${processingMethod}`);
    }

    const varietyText = details.variety || '';
    const varietiesStrings = varietyText
      .split(/[,/&]| and /u)
      .map((s) => s.trim())
      .filter(Boolean);
    const varietyIds = varieties
      .filter(
        ({ name, alias }) =>
          varietiesStrings.includes(name.toLowerCase()) ||
          (alias && varietiesStrings.includes(alias.toLowerCase())) ||
          varietiesStrings.some((v) => v.includes(name.toLowerCase()))
      )
      .filter(({ name }) => name.toLowerCase() !== originCountry)
      .map(({ id }) => id);

    if (!varietyIds.length) {
      logger.info(`Missing varieties: ${varietiesStrings}`);
    }

    const flavourNotes = details['flavour notes'] || '';
    const tasteNotesStrings = flavourNotes
      .split(/,| and /u)
      .map((s) => s.trim())
      .filter(Boolean);
    const tasteNotesFound = tasteNotes.filter(({ name }) => tasteNotesStrings.includes(name));
    const distinctTasteNotes = tasteNotesFound.filter(
      ({ name }) => !tasteNotesFound.some(({ name: n }) => n !== name && n.includes(name))
    );
    const tasteNoteIds = Array.from(new Set(distinctTasteNotes.map(({ taste_note_id: id }) => id)));

    const imageUrls = (Array.isArray(productData.image) ? productData.image : [productData.image]).filter(Boolean);
    const hasEspressoBag = imageUrls.some((img) => /[-_]espresso[-_.]/iu.test(img));
    const hasFilterBag = imageUrls.some((img) => /[-_]filter[-_.]/iu.test(img));
    const hasOmniBag = imageUrls.some((img) => /[-_]omni[-_.]/iu.test(img));
    const urlRoast = productData.offers?.url?.match(/Roast=([A-Za-z]+)/iu)?.[1].toLowerCase();
    const isOmni =
      hasOmniBag || (hasEspressoBag && hasFilterBag) || (!hasEspressoBag && !hasFilterBag && urlRoast === 'omni');
    const isEspresso = !isOmni && (hasEspressoBag || (!hasFilterBag && urlRoast === 'espresso'));
    const isFilter = !isOmni && (hasFilterBag || (!hasEspressoBag && urlRoast === 'filter'));
    const brewingMethodId =
      brewingMethods.find(
        ({ name }) =>
          (isOmni && name === 'omni') ||
          (isFilter && !isEspresso && name === 'filter') ||
          (isEspresso && !isFilter && name === 'espresso')
      )?.brewing_method_id || null;

    if (!brewingMethodId) {
      logger.info(`Missing brewing method for ${url}`);
    }

    const isDecaf = /decaf|no.?caf/iu.test(productName) || /decaf|no.?caf/iu.test(url);

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
  // Typika
  14: ({ html, url, roasterId }) => {
    logger.info(`Parsing item page: ${url}`);

    const document = getDocument(html);

    if (document.querySelector('.product__title').textContent.toLowerCase().includes('blend')) {
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
  // april
  47: async ({ html, url, roasterId }) => {
    logger.info(`Parsing item page: ${url}`);

    const document = getDocument(html);

    const productScriptEl = document.querySelector('script[data-section-type="static-product"]');

    if (!productScriptEl) {
      logger.error(`No product data found for ${url}`);

      throw new Error(errors.detailsMissing);
    }

    const { product } = JSON.parse(productScriptEl.textContent);

    const availableVariants = product.variants.filter((v) => v.available);

    if (!availableVariants.length) {
      return { isOutOfStock: true };
    }

    const parseVariantWeight = (title) => {
      const match = title.match(/^(\d+)(g|kg)/i);

      if (!match) {
        return undefined;
      }

      const num = Number(match[1]);

      return match[2].toLowerCase() === 'kg' ? num * 1000 : num;
    };

    const sortedVariants = availableVariants.sort((a, b) => parseVariantWeight(a.title) - parseVariantWeight(b.title));
    const smallestVariant = sortedVariants[0];
    const price = Number((smallestVariant.price / 100).toFixed(2));
    const weight = parseVariantWeight(smallestVariant.title);

    if (!price || isNaN(price)) {
      logger.error(`No price found for ${url}`);

      throw new Error(errors.priceMissing);
    }

    if (!weight || isNaN(weight)) {
      logger.error(`No weight found for ${url}`);

      throw new Error(errors.weightMissing);
    }

    const pricePerGram = Number((price / weight).toFixed(2));

    const allScripts = Array.from(document.querySelectorAll('script:not([src])'));
    const productSchemaEl = allScripts.find(
      (s) => s.textContent.includes('"Product"') && s.textContent.includes('priceCurrency')
    );

    if (!productSchemaEl) {
      logger.error(`No currency found for ${url}`);

      throw new Error(errors.currencyMissing);
    }

    const schemaData = JSON.parse(productSchemaEl.textContent);
    const currency = schemaData.offers?.priceCurrency || schemaData.offers?.[0]?.priceCurrency;

    if (!currency) {
      logger.error(`No currency found for ${url}`);

      throw new Error(errors.currencyMissing);
    }

    const image = product.featured_image ? `https:${product.featured_image}` : null;

    if (!image) {
      logger.error(`No image found for ${url}`);

      throw new Error(errors.imageMissing);
    }

    // Preprocess description HTML to ensure block elements and <br> produce whitespace
    const descText = (product.description || '')
      .replace(/\xa0/g, ' ')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<\/(?:p|div|h[1-6]|li|td|th)>/gi, ' ')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .trim();

    if (product.title.toLowerCase().includes('blend') || descText.includes(' blend ')) {
      return { isBlend: true };
    }

    const isDecaf = url.includes('decaf') || product.title.toLowerCase().includes('decaf');

    const STOP =
      'farm(?:er)?|producer|region|location|varietal|processing(?:\\s+method)?|fl[ao]vo(?:u?r)\\s+notes?|roast(?:\\s+profile)?|growing\\s+altitude|sweetness|body|acidity';

    const getField = (fieldPattern) => {
      const regex = new RegExp(`(?:${fieldPattern})\\s*:\\s*(.+?)(?=(?:${STOP})\\s*:|$)`, 'is');

      return (descText.match(regex)?.[1] || '').trim();
    };

    const locationText = getField('location|region');
    const originCountryEntry =
      originCountries.find(({ name }) => locationText.includes(name)) ||
      originCountries.find(({ name }) =>
        product.title
          .toLowerCase()
          .split(/\s*[-–]\s*/)
          .includes(name)
      );
    const originCountryId = originCountryEntry?.origin_country_id || null;

    if (!originCountryId) {
      logger.error(`No origin country found for ${url}`);

      throw new Error(errors.originCountryMissing);
    }

    const originRegionId = originRegions.find(({ name }) => locationText.includes(name))?.origin_region_id || null;

    if (!originRegionId) {
      logger.info(`Missing origin region: ${locationText}`);
    }

    const processingText = getField('processing(?:\\s+method)?');
    const varietalText = getField('varietal');

    const sortedProcessingMethods = [...processingMethods].sort((a, b) => b.name.length - a.name.length);

    const processingMethodId =
      sortedProcessingMethods.find(({ name }) => processingText.startsWith(name))?.processing_method_id ||
      sortedProcessingMethods.find(({ name }) => processingText.includes(name))?.processing_method_id ||
      sortedProcessingMethods.find(({ name }) => varietalText.startsWith(name))?.processing_method_id ||
      processingMethods.find(({ name }) => varietalText.startsWith('washed') && name === 'washed')
        ?.processing_method_id ||
      processingMethods.find(({ name }) => varietalText.startsWith('natural') && name === 'natural')
        ?.processing_method_id ||
      processingMethods.find(({ name }) => varietalText.startsWith('honey') && name === 'honey')
        ?.processing_method_id ||
      null;

    if (!processingMethodId) {
      logger.info(`Missing processing method for ${url}`);
    }

    let cleanVarietalText = varietalText;

    if (!processingText) {
      cleanVarietalText = cleanVarietalText
        .replace(/^(?:washed|natural|honey|anaerobic)\s+(?:process(?:ed)?\s+)?/i, '')
        .trim();
    }

    cleanVarietalText = cleanVarietalText
      .replace(/\([^)]*\)/g, '')
      .replace(/\s+varieties?\s*$/, '')
      .trim();

    const varietiesStrings = cleanVarietalText
      .split(/[,/&+]/)
      .map((s) => s.trim())
      .filter(Boolean);

    const varietyIds = varieties
      .filter(({ name, alias }) =>
        varietiesStrings.some(
          (s) => name.toLowerCase() === s || (alias && alias.toLowerCase() === s) || s.includes(name.toLowerCase())
        )
      )
      .map(({ id }) => id);

    if (!varietyIds.length) {
      logger.info(`Missing varieties: ${varietiesStrings}`);
    }

    const isEspressoUrl = url.includes('/collections/espresso-beans/');
    const isFilterUrl = url.includes('/collections/filter-beans/');
    const brewingMethodId =
      brewingMethods.find(
        ({ name }) =>
          (isEspressoUrl && !isFilterUrl && name === 'espresso') || (isFilterUrl && !isEspressoUrl && name === 'filter')
      )?.brewing_method_id || null;

    if (!brewingMethodId) {
      logger.info(`Missing brewing method for ${url}`);
    }

    const flavorText = getField('fl[ao]vo(?:u?r)\\s+notes?');
    const flavorStrings = flavorText
      .split(/[,&+]/)
      .map((s) => s.trim().replace(/\.$/, ''))
      .filter(Boolean);

    const tasteNoteIds = Array.from(
      new Set(
        flavorStrings
          .map(
            (note) =>
              tasteNotes.find(({ name }) => name === note)?.taste_note_id ||
              tasteNotes.find(({ name }) => note.includes(name))?.taste_note_id
          )
          .filter(Boolean)
      )
    );

    if (!tasteNoteIds.length) {
      logger.info(`Missing taste notes: ${flavorStrings}`);
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
      logger.info(`Missing varieties: ${missingVarieties.join(', ')}`);
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
      logger.info(`Missing varieties: ${missingVarieties.join(', ')}`);
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
  // A.M.O.C.
  94: ({ html, url, roasterId }) => {
    logger.info(`Parsing item page: ${url}`);

    const document = getDocument(html);

    const variationsData = document.querySelector('.variations_form')?.dataset?.product_variations;

    if (!variationsData) {
      logger.error(`No variation data found for ${url}`);

      throw new Error(errors.detailsMissing);
    }

    const variations = JSON.parse(variationsData);
    const availableVariants = variations
      .filter((v) => v.is_in_stock && !v.attributes.attribute_pa_contents?.includes('1000'))
      .sort((a, b) => parseFloat(a.weight) - parseFloat(b.weight));

    if (!availableVariants.length) {
      logger.info(`Out of stock for ${url}`);

      return { isOutOfStock: true };
    }

    const smallestVariant = availableVariants[0];
    const price = Number(smallestVariant.display_price.toFixed(2));
    const weight = Number(smallestVariant.attributes.attribute_pa_contents?.match(/\d+/)?.[0]);

    if (!price || isNaN(price)) {
      logger.error(`No price found for ${url}`);

      throw new Error(errors.priceMissing);
    }

    if (!weight || isNaN(weight)) {
      logger.error(`No weight found for ${url}`);

      throw new Error(errors.weightMissing);
    }

    const currency = 'EUR';
    const pricePerGram = Number((price / weight).toFixed(2));

    const details = Array.from(document.querySelectorAll('h4')).reduce((_details, h4) => {
      const key = h4.textContent.trim().toLowerCase();
      const value = h4.closest('td')?.nextElementSibling?.textContent?.trim().toLowerCase();

      if (value) {
        _details[key] = value;
      }

      return _details;
    }, {});

    const originText = details.origin || '';
    const titleText = document.querySelector('h1.product_title')?.textContent.trim().toLowerCase() || '';
    const originCountryId =
      originCountries.find(({ name }) => originText.includes(name))?.origin_country_id ||
      originCountries.find(({ name }) => titleText.includes(name))?.origin_country_id ||
      null;

    if (!originCountryId) {
      logger.error(`No origin country found for ${url}`);

      throw new Error(errors.originCountryMissing);
    }

    const originRegionId = originRegions.find(({ name }) => originText.includes(name))?.origin_region_id || null;

    if (!originRegionId) {
      logger.info(`Missing origin region: ${originText}`);
    }

    const processingText = details.processing || '';
    const processingMethodId =
      processingMethods.find(({ name }) => name === processingText)?.processing_method_id ||
      processingMethods.find(({ name }) => processingText.includes(name))?.processing_method_id ||
      null;

    if (!processingMethodId) {
      logger.info(`Missing processing method: ${processingText}`);
    }

    const varietyText = details.variety || '';
    const varietiesStrings = varietyText
      .toLowerCase()
      .split(/[|,&—/]/)
      .map((s) => s.replace(/\*/g, '').trim())
      .filter(Boolean);
    const varietyIds = varieties
      .filter(
        ({ name, alias }) =>
          varietiesStrings.includes(name.toLowerCase()) || (alias && varietiesStrings.includes(alias.toLowerCase()))
      )
      .map(({ id }) => id);

    if (!varietyIds.length) {
      logger.info(`Missing varieties: ${varietiesStrings}`);
    }

    const profileText = details.profile || '';
    const tasteNoteStrings = profileText
      .split(/[,&+]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const tasteNoteIds = tasteNoteStrings
      .map(
        (note) =>
          tasteNotes.find(({ name }) => name === note)?.taste_note_id ||
          tasteNotes.find(({ name }) => note.includes(name))?.taste_note_id
      )
      .filter(Boolean);

    const missingTasteNotes = tasteNoteStrings.filter((note) => !tasteNotes.some(({ name }) => name === note));

    if (missingTasteNotes.length) {
      logger.info(`Missing taste notes: ${missingTasteNotes.join(', ')}`);
    }

    const roastAttr = smallestVariant.attributes.attribute_pa_roast;
    const brewingMethodId =
      brewingMethods.find(({ name }) => name === roastAttr)?.brewing_method_id ||
      brewingMethods.find(({ name }) => roastAttr?.includes(name))?.brewing_method_id ||
      null;

    if (!brewingMethodId) {
      logger.info(`Missing brewing method: ${roastAttr}`);
    }

    const title = document.querySelector('h1.product_title')?.textContent.trim().toLowerCase() || '';
    const isDecaf = title.includes('decaf') || url.includes('decaf');

    const image = document.querySelector('.woocommerce-product-gallery__image img')?.src;

    if (!image) {
      logger.error(`No image found for ${url}`);

      throw new Error(errors.imageMissing);
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
  // Nolens Volens
  258: ({ html, url, roasterId }) => {
    logger.info(`Parsing item page: ${url}`);

    const document = getDocument(html);

    const variationsAttr = document.querySelector('.variations_form')?.getAttribute('data-product_variations');

    if (!variationsAttr) {
      logger.error(`No variations found for ${url}`);

      throw new Error(errors.detailsMissing);
    }

    const variations = JSON.parse(variationsAttr).filter((v) => v.is_in_stock && v.is_purchasable);

    if (!variations.length) {
      return { isOutOfStock: true };
    }

    const smallest = [...variations].sort((a, b) => Number(a.weight) - Number(b.weight))[0];
    const price = Number(smallest.display_price).toFixed(2);
    const weight = Number(smallest.weight);

    if (!price || isNaN(price)) {
      logger.error(`No price found for ${url}`);

      throw new Error(errors.priceMissing);
    }

    if (!weight || isNaN(weight)) {
      logger.error(`No weight found for ${url}`);

      throw new Error(errors.weightMissing);
    }

    const pricePerGram = Number((price / weight).toFixed(2));

    const priceHtmlDocument = getDocument(smallest.price_html || '');
    const currencySymbol = priceHtmlDocument.querySelector('.woocommerce-Price-currencySymbol')?.textContent.trim();
    const currency = currencyCodes[currencySymbol];

    if (!currency) {
      logger.error(`Unknown currency: ${currencySymbol}`);

      throw new Error(errors.currencyMissing);
    }

    const image = smallest.image?.url;

    if (!image) {
      logger.error(`No image found for ${url}`);

      throw new Error(errors.imageMissing);
    }

    const slugWords = url.replace(/\/$/u, '').split('/').pop().toLowerCase().replace(/-/gu, ' ');
    const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
    const wordBoundary = (text, term) => new RegExp(`(?<!\\p{L})${escapeRegex(term)}(?!\\p{L})`, 'iu').test(text);

    const sortedCountries = [...originCountries].sort((a, b) => b.name.length - a.name.length);
    const originCountryEntry = sortedCountries.find(({ name }) => wordBoundary(slugWords, name));
    const originCountryId = originCountryEntry?.origin_country_id || null;

    if (!originCountryId) {
      return { isBlend: true };
    }

    const categoryText = document.querySelector('.single-product-category')?.textContent.toLowerCase() || '';
    const isEspresso = wordBoundary(categoryText, 'espresso') || /-espresso(\b|$)/u.test(url.toLowerCase());
    const isFilter = wordBoundary(categoryText, 'filtr') || /-filtr(\b|$)/u.test(url.toLowerCase());
    const isOmni = categoryText.includes('omniroast') || url.toLowerCase().includes('omniroast');
    const brewingMethodId =
      brewingMethods.find(
        ({ name }) =>
          (isOmni && name === 'omni') ||
          (!isOmni && isEspresso && isFilter && name === 'omni') ||
          (!isOmni && isEspresso && !isFilter && name === 'espresso') ||
          (!isOmni && !isEspresso && isFilter && name === 'filter')
      )?.brewing_method_id || null;

    // Spec text excludes paragraphs longer than 100 chars (free-form descriptions) so
    // names like "caturra" mentioned in marketing copy don't match as varieties
    const specText = Array.from(document.querySelectorAll('.woocommerce-product-details__short-description p'))
      .map((p) => p.textContent.trim().toLowerCase())
      .filter((p) => p && p.length < 100)
      .join(' ');
    const searchText = `${specText} ${slugWords}`;
    const tasteNotesText =
      document.querySelector('.woocommerce-product-details__short-description p')?.textContent.toLowerCase().trim() ||
      '';

    const sortedTasteNotes = [...tasteNotes]
      .filter(({ language_code: lc }) => lc === 'pl')
      .sort((a, b) => b.name.length - a.name.length);
    const matchedTasteNotes = sortedTasteNotes.filter(({ name }) => wordBoundary(tasteNotesText, name));
    // exclude taste notes that include each other like 'orzechy' and 'orzechy laskowe'
    const tasteNoteIds = Array.from(
      new Set(
        matchedTasteNotes
          .filter(({ name }) => !matchedTasteNotes.some(({ name: n }) => n !== name && n.includes(name)))
          .map(({ taste_note_id: id }) => id)
      )
    );

    if (!tasteNoteIds.length) {
      logger.info(`Missing taste notes: ${tasteNotesText}`);
    }

    const sortedProcessing = [...processingMethods].sort((a, b) => b.name.length - a.name.length);
    const processingMethodId =
      sortedProcessing.find(({ name }) => wordBoundary(searchText, name))?.processing_method_id || null;

    if (!processingMethodId) {
      logger.info(`Missing processing method: ${searchText}`);
    }

    const sortedVarieties = [...varieties].sort((a, b) => b.name.length - a.name.length);
    const varietyIds = Array.from(
      new Set(
        sortedVarieties
          .filter(({ name, alias }) => wordBoundary(searchText, name) || (alias && wordBoundary(searchText, alias)))
          .filter(({ name }) => name.toLowerCase() !== originCountryEntry.name.toLowerCase())
          .map(({ id }) => id)
      )
    );

    if (!varietyIds.length) {
      logger.info(`Missing varieties: ${searchText}`);
    }

    const originRegionId =
      originRegions
        .filter(({ origin_country_id: countryId }) => countryId === originCountryId) // eslint-disable-line camelcase
        .sort((a, b) => b.name.length - a.name.length)
        .find(({ name }) => slugWords.includes(name) || specText.includes(name))?.origin_region_id || null;

    if (!originRegionId) {
      logger.info(`Missing origin region: ${slugWords}`);
    }

    const originFarmId =
      originFarms.find(
        ({ name, origin_country_id: countryId }) =>
          // eslint-disable-line camelcase
          countryId === originCountryId &&
          (slugWords.includes(name.toLowerCase()) || specText.includes(name.toLowerCase()))
      )?.id || null;

    const isDecaf = url.toLowerCase().includes('decaf') || specText.includes('decaf');

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
  // Pikola
  265: async ({ html, url, roasterId }) => {
    logger.info(`Parsing item page: ${url}`);

    const document = getDocument(html);

    const availability = document.querySelector('link[itemprop="availability"]')?.getAttribute('href') || '';

    if (!availability.toLowerCase().includes('instock')) {
      logger.info(`Out of stock for ${url}`);

      return { isOutOfStock: true };
    }

    const details = Array.from(document.querySelectorAll('table.table tbody tr')).reduce((acc, row) => {
      const key = row.querySelector('th span')?.textContent.trim().toLowerCase();
      const value = row.querySelector('td')?.textContent.trim().toLowerCase();

      if (key && value) {
        acc[key] = value;
      }

      return acc;
    }, {});

    const processingText = details['rodzaj obróbki'] || '';

    if (processingText === 'blend' || !details.farma) {
      logger.info(`Blend detected for ${url}`);

      return { isBlend: true };
    }

    const price = Number(document.querySelector('meta[itemprop="price"]')?.getAttribute('content'));

    if (!price || isNaN(price)) {
      logger.error(`No price found for ${url}`);

      throw new Error(errors.priceMissing);
    }

    const currency = document.querySelector('meta[itemprop="priceCurrency"]')?.getAttribute('content');

    if (!currency) {
      logger.error(`No currency found for ${url}`);

      throw new Error(errors.currencyMissing);
    }

    const variantTexts = Array.from(document.querySelectorAll('select.variantsObject option'))
      .map((option) => option.textContent.trim())
      .filter((text) => /\d/u.test(text) && /\b(g|kg)\b/iu.test(text));
    const weights = variantTexts
      .map((text) => {
        const match = text.match(/(\d+(?:[.,]\d+)?)\s*(kg|g)/iu);

        if (!match) {
          return null;
        }

        const value = parseFloat(match[1].replace(',', '.'));

        return match[2].toLowerCase() === 'kg' ? value * 1000 : value;
      })
      .filter(Boolean)
      .sort((a, b) => a - b);
    const weight = weights[0];

    if (!weight || isNaN(weight)) {
      logger.error(`No weight found for ${url}`);

      throw new Error(errors.weightMissing);
    }

    const pricePerGram = Number((price / weight).toFixed(2));

    const title =
      document.querySelector('h1[itemprop="name"] .h1AddVariantText')?.textContent.trim().toLowerCase() ||
      document.querySelector('h1[itemprop="name"]')?.textContent.trim().toLowerCase() ||
      '';
    const titleFirstWord = title.split(/[\s(]/u)[0];

    const regionText = details.region || '';
    const farmText = details.farma || '';

    let originCountryId =
      originCountries.find(({ name }) => name === titleFirstWord)?.origin_country_id ||
      originCountries.find(({ name }) => titleFirstWord.includes(name))?.origin_country_id ||
      null;

    if (!originCountryId) {
      const matchedRegion = originRegions.find(({ name }) => regionText.includes(name));

      if (matchedRegion) {
        originCountryId = matchedRegion.origin_country_id;
      }
    }

    if (!originCountryId) {
      const translatedTitle = (await translate({ text: titleFirstWord, from: 'pl', to: 'en' })).trim().toLowerCase();

      originCountryId = originCountries.find(({ name }) => name === translatedTitle)?.origin_country_id || null;
    }

    if (!originCountryId) {
      logger.error(`No origin country found for ${url}`);

      throw new Error(errors.originCountryMissing);
    }

    const originRegionId =
      originRegions
        .filter(({ origin_country_id: countryId }) => countryId === originCountryId) // eslint-disable-line camelcase
        .find(({ name }) => regionText.includes(name))?.origin_region_id || null;

    if (!originRegionId) {
      logger.info(`Missing origin region: ${regionText}`);
    }

    const originFarmId =
      originFarms.find(
        ({ name, origin_country_id: countryId }) =>
          // eslint-disable-line camelcase
          countryId === originCountryId && farmText.includes(name.toLowerCase())
      )?.id || null;

    const sortedProcessingMethods = [...processingMethods].sort((a, b) => b.name.length - a.name.length);
    let processingMethodId =
      sortedProcessingMethods.find(({ name }) => name.toLowerCase() === processingText)?.processing_method_id ||
      sortedProcessingMethods.find(({ name }) => processingText.includes(name.toLowerCase()))?.processing_method_id ||
      null;

    if (!processingMethodId && processingText) {
      const translatedProcessing = (await translate({ text: processingText, from: 'pl', to: 'en' }))
        .trim()
        .toLowerCase();

      processingMethodId =
        sortedProcessingMethods.find(({ name }) => name.toLowerCase() === translatedProcessing)?.processing_method_id ||
        sortedProcessingMethods.find(({ name }) => translatedProcessing.includes(name.toLowerCase()))
          ?.processing_method_id ||
        null;
    }

    if (!processingMethodId) {
      logger.info(`Missing processing method: ${processingText}`);
    }

    const profileText = details['profil palenia'] || '';
    const brewingMethodId =
      brewingMethods.find(
        ({ name }) =>
          (profileText.includes('omni') && name === 'omni') ||
          (profileText.includes('filtr') && name === 'filter') ||
          (profileText.includes('espresso') && name === 'espresso')
      )?.brewing_method_id ||
      brewingMethods.find(
        ({ name }) =>
          (url.endsWith('-omni') && name === 'omni') ||
          (url.endsWith('-filtr') && name === 'filter') ||
          (url.endsWith('-espresso') && name === 'espresso')
      )?.brewing_method_id ||
      null;

    if (!brewingMethodId) {
      logger.info(`Missing brewing method: ${profileText}`);
    }

    const varietyText = details['odmiana botaniczna'] || '';
    const varietyStrings = varietyText
      .split(/[,/]/u)
      .map((s) => s.trim().replace(/\s+/gu, ' '))
      .filter(Boolean);
    const varietyIds = Array.from(
      new Set(
        varieties
          .filter(({ name, alias }) =>
            varietyStrings.some(
              (s) =>
                name.toLowerCase() === s ||
                name.toLowerCase().replace(/[\s-]/gu, '') === s.replace(/[\s-]/gu, '') ||
                (alias && alias.toLowerCase() === s) ||
                (name.toLowerCase() === 'mundo novo' && s === 'mundo nuovo') // typo on site
            )
          )
          .map(({ id }) => id)
      )
    );

    if (!varietyIds.length) {
      logger.info(`Missing varieties: ${varietyStrings}`);
    }

    const tasteText = details.smak || '';
    const tasteNoteStrings = tasteText
      .split(/[,\n]/u)
      .map((s) => s.trim().replace(/\.$/u, ''))
      .filter(Boolean);

    let tasteNoteIds = Array.from(
      new Set(
        tasteNoteStrings
          .map(
            (note) =>
              tasteNotes.find(({ name }) => name === note)?.taste_note_id ||
              tasteNotes.find(({ name }) => note.includes(name))?.taste_note_id
          )
          .filter(Boolean)
      )
    );

    if (tasteNoteIds.length < tasteNoteStrings.length && tasteText) {
      const translatedTasteNotes = (await translate({ text: tasteText, from: 'auto', to: 'en' })).toLowerCase();
      const translatedStrings = translatedTasteNotes
        .split(/[,\n]/u)
        .map((s) => s.trim().replace(/\.$/u, ''))
        .filter(Boolean);

      tasteNoteIds = Array.from(
        new Set([
          ...tasteNoteIds,
          ...translatedStrings
            .map(
              (note) =>
                tasteNotes.find(({ name }) => name === note)?.taste_note_id ||
                tasteNotes.find(({ name }) => note.includes(name))?.taste_note_id
            )
            .filter(Boolean)
        ])
      );
    }

    if (!tasteNoteIds.length) {
      logger.info(`Missing taste notes: ${tasteNoteStrings}`);
    }

    const isDecaf = url.includes('decaf') || title.includes('decaf') || processingText.includes('decaf');

    const image =
      document.querySelector('img[itemprop="image"]')?.getAttribute('src') ||
      document.querySelector('.pd-pht-main img')?.getAttribute('src');

    if (!image) {
      logger.error(`No image found for ${url}`);

      throw new Error(errors.imageMissing);
    }

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

    const detailNames = Array.from(
      document.querySelectorAll(
        '.woocommerce-product-details__short-description b, .woocommerce-product-details__short-description strong'
      )
    ).map((element) => element.textContent.replace(':', '').trim().toLowerCase());

    let detailValues = Array.from(
      document.querySelectorAll(
        '.woocommerce-product-details__short-description b, .woocommerce-product-details__short-description strong'
      )
    ).map((element) => element.nextSibling?.textContent.replace(':', '').trim().toLowerCase());

    if (detailValues.length === 0) {
      detailValues = Array.from(document.querySelectorAll('.woocommerce-product-details__short-description i')).map(
        (element) => element.textContent.replace(':', '').trim().toLowerCase()
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

    if (missingTasteNotes?.length) {
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
    const originCountryId =
      originCountries.find(({ name }) => name === originCountry)?.origin_country_id ||
      originCountries.find(({ name }) => name.replaceAll(' ', '') === originCountry)?.origin_country_id ||
      null;

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
            .match(/(?:weight|teža):\s*(\d+)\s*g/iu)?.[1]
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
      const value = valueElement.textContent.toLowerCase().replace(':', '').trim();

      _details[key] = value;

      return _details;
    }, {});

    const processingMethodId =
      processingMethods.find(({ name }) => name === details.process)?.processing_method_id ||
      processingMethods.find(({ name }) => details.process?.includes(name))?.processing_method_id ||
      null;

    if (!processingMethodId) {
      logger.debug(errors.processingMethodMissing, ': ', details.process);
    }

    const originRegionId = originRegions.find(({ name }) => name === details.region)?.origin_region_id || null;

    if (!originRegionId) {
      logger.debug(errors.originRegionMissing, ': ', details.region);
    }

    const originFarmId = originFarms.find(({ name }) => details.producer?.includes(name))?.id || null;

    const varietiesStrings = details.variety || details.varieties || '';
    const varietyIds = varieties
      .filter(
        ({ name, alias }) =>
          varietiesStrings.includes(name.toLowerCase()) || (alias && varietiesStrings.includes(alias.toLowerCase()))
      )
      .map(({ id }) => id);
    const missingVarieties = varietiesStrings
      .split(', ')
      .filter(
        (name) =>
          name &&
          !varieties.map((variety) => variety.name.toLowerCase()).includes(name) &&
          !varieties.map((variety) => variety.alias?.toLowerCase()).includes(name)
      );

    if (missingVarieties.length) {
      logger.info(`Missing varieties: ${missingVarieties}`);
    }

    const tasteNoteStrings = (details.notes || details['taste notes'] || '').split(', ').filter(Boolean);
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
      logger.info(`Missing varieties: ${missingVarieties}`);
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

    const weightMatch = details.match(/(\d+(?:[.,]\d+)?)\s*(kg|g)\b/i);
    const weight = weightMatch
      ? Math.round(parseFloat(weightMatch[1].replace(',', '.')) * (weightMatch[2].toLowerCase() === 'kg' ? 1000 : 1))
      : undefined;

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
      logger.info(`Missing varieties: ${missingVarieties}`);
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
  },
  // Craft Beans
  297: async ({ html, url, roasterId }) => {
    logger.info(`Parsing item page: ${url}`);

    const document = getDocument(html);

    const priceText = document.querySelector('.JsPrice')?.dataset?.price;
    const basePrice = parseFloat(priceText || 0);

    if (!basePrice || isNaN(basePrice)) {
      logger.error(`No base price found for ${url}`);
      throw new Error(errors.priceMissing);
    }

    const currency = currencyCodes['zł'];

    const weightOptions = Array.from(document.querySelectorAll('.jsProductWeight option'));
    const parsedWeights = weightOptions
      .map((o) => {
        const txt = o.textContent.trim().toLowerCase();
        const impact = parseFloat(o.dataset.impact || 0);
        let weight = null;
        if (txt.includes('g') || txt.includes('kg')) {
          const num = parseFloat(txt.replace(/[^0-9.]/g, ''));
          if (txt.includes('kg')) weight = num * 1000;
          else weight = num;
        }
        return { weight, price: basePrice + impact };
      })
      .filter((w) => w.weight && w.weight <= 1000); // Filter out bulk packs like 3x1kg

    let selectedWeight = parsedWeights.find((w) => w.weight === 250) || parsedWeights[0];

    if (!selectedWeight) {
      const titleText = document.querySelector('h1')?.textContent || '';
      const bodyText = document.body.textContent;
      const sachetMatch = `${titleText} ${bodyText}`.match(/(\d+)\s*saszet\w*\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*g/i);
      const singleSachetMatch = titleText.match(/saszetka\s*(\d+(?:[.,]\d+)?)\s*g/i);
      const netWeightMatch = bodyText.match(/waga\s+netto:?\s*(\d+(?:[.,]\d+)?)\s*g/i);

      let fallbackWeight = null;
      if (sachetMatch) {
        fallbackWeight = parseInt(sachetMatch[1], 10) * parseFloat(sachetMatch[2].replace(',', '.'));
      } else if (singleSachetMatch) {
        fallbackWeight = parseFloat(singleSachetMatch[1].replace(',', '.'));
      } else if (netWeightMatch) {
        fallbackWeight = parseFloat(netWeightMatch[1].replace(',', '.'));
      }

      if (fallbackWeight && fallbackWeight <= 1000) {
        selectedWeight = { weight: fallbackWeight, price: basePrice };
      }
    }

    if (!selectedWeight) {
      logger.error(`No weight found for ${url}`);

      throw new Error(errors.weightMissing);
    }

    const weight = selectedWeight.weight;
    const price = selectedWeight.price;
    const pricePerGram = Number((price / weight).toFixed(2));

    const title = document.querySelector('h1')?.textContent.trim().toLowerCase() || '';
    const textContent = document.body.textContent.toLowerCase();

    const originCountryId = originCountries.find(({ name }) => textContent.includes(name))?.origin_country_id || null;

    if (!originCountryId && !url.includes('bezkofeinowe')) {
      logger.error(`No origin country found for ${url}`);
      throw new Error(errors.originCountryMissing);
    }

    const isDecaf = url.includes('bezkofeinowe') || url.includes('decaf') || title.includes('decaf');

    const itemImage = document.querySelector('.woocommerce-product-gallery__image img')?.src;
    const wpImage = document.querySelector('.wp-post-image')?.src;
    const pictureImage = document.querySelector('picture img')?.src;
    const thumbsImage = document.querySelector('img[src*="files/thumbs"]')?.src;

    let image = itemImage || wpImage || pictureImage || thumbsImage;

    if (image) {
      image = image.replace(/&amp;/g, '&');
    }

    if (!image) {
      logger.error(`No image found for ${url}`);
      throw new Error(errors.imageMissing);
    }

    const lines = document.body.textContent.toLowerCase().split(/\n|\r/);
    let tasteNotesDescription = lines.find((l) => l.includes('nuty smakowe:') || l.includes('w smaku dominują')) || '';

    tasteNotesDescription = tasteNotesDescription
      .replace(/czarnych porzeczek/g, 'czarna porzeczka')
      .replace(/jagód/g, 'jagody')
      .replace(/czekoladowo-orzechowe/g, 'czekolada orzechy')
      .replace(/orzechow[ae]\b/g, 'orzechy')
      .replace(/czekoladow[ae]\b/g, 'czekolada')
      .replace(/miodowym\b/g, 'miód')
      .replace(/orzech prażony/g, 'orzechy');

    const tasteNoteIds = Array.from(
      new Set(
        tasteNotes
          .filter(
            ({ name, alias }) =>
              tasteNotesDescription.includes(name.toLowerCase()) ||
              (alias && tasteNotesDescription.includes(alias.toLowerCase()))
          )
          .map(({ taste_note_id: id }) => id)
      )
    );

    const varietyDescription = lines.find((l) => l.includes('odmiana:') || l.includes('odmiana botaniczna:')) || '';
    const varietyIds = Array.from(
      new Set(
        varieties
          .filter(
            ({ name, alias }) =>
              varietyDescription.includes(name.toLowerCase()) ||
              (alias && varietyDescription.includes(alias.toLowerCase()))
          )
          .map(({ id }) => id)
      )
    );

    const isEspresso = url.includes('espresso') || title.includes('espresso');
    const isFilter = url.includes('przelew');

    const brewingMethodId =
      brewingMethods.find(
        ({ name }) =>
          (isFilter && isEspresso && name === 'omni') ||
          (isEspresso && !isFilter && name === 'espresso') ||
          (!isEspresso && isFilter && name === 'filter')
      )?.brewing_method_id || brewingMethods.find(({ name }) => name === 'omni')?.brewing_method_id;

    return {
      brewingMethodId,
      currency,
      image,
      isDecaf,
      originCountryId,
      price,
      pricePerGram,
      roasterId,
      tasteNoteIds,
      varietyIds,
      webshopItemLink: url,
      weight
    };
  },
  // Datura
  304: ({ html, url, roasterId }) => {
    logger.info(`Parsing item page: ${url}`);

    const document = getDocument(html);

    const ldScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    const ldData = ldScripts
      .map((script) => {
        try {
          return JSON.parse(script.textContent);
        } catch {
          return null;
        }
      })
      .find((data) => data?.['@type'] === 'ProductGroup' || data?.['@type'] === 'Product');

    if (!ldData) {
      logger.error(`No product data found for ${url}`);

      throw new Error(errors.detailsMissing);
    }

    const parseWeight = (text) => {
      const match = text.match(/(\d+(?:\.\d+)?)\s*(g|kg)\b/iu);

      if (!match) {
        return undefined;
      }

      const num = Number(match[1]);

      return match[2].toLowerCase() === 'kg' ? num * 1000 : num;
    };

    const variantSources = ldData['@type'] === 'ProductGroup' ? ldData.hasVariant || [] : [ldData];

    const unitPriceWeight = parseWeight(document.querySelector('.unit-price .price-item')?.textContent || '');

    const availableVariants = variantSources
      .filter((variant) => variant?.offers?.availability === 'http://schema.org/InStock')
      .map((variant) => ({
        price: Number(variant.offers.price),
        currency: variant.offers.priceCurrency,
        weight: parseWeight(variant.name || '') || unitPriceWeight,
        image: variant.image
      }))
      .filter((variant) => variant.weight)
      .sort((a, b) => a.weight - b.weight);

    if (!availableVariants.length) {
      return { isOutOfStock: true };
    }

    const smallestVariant = availableVariants[0];
    const price = Number(smallestVariant.price.toFixed(2));
    const weight = smallestVariant.weight;

    if (!price || isNaN(price)) {
      logger.error(`No price found for ${url}`);

      throw new Error(errors.priceMissing);
    }

    if (!weight || isNaN(weight)) {
      logger.error(`No weight found for ${url}`);

      throw new Error(errors.weightMissing);
    }

    const pricePerGram = Number((price / weight).toFixed(2));

    const currency = smallestVariant.currency;

    if (!currency) {
      logger.error(`No currency found for ${url}`);

      throw new Error(errors.currencyMissing);
    }

    const image = smallestVariant.image;

    if (!image) {
      logger.error(`No image found for ${url}`);

      throw new Error(errors.imageMissing);
    }

    const title = (ldData.name || '').replace(/\s+/gu, ' ').trim().toLowerCase();
    const description = ldData.description || '';

    const specs = {};

    description.split(/\r?\n/u).forEach((line) => {
      const match = line.match(/^([^:]{1,40}?)\s*:\s*(.+)$/u);

      if (!match) {
        return;
      }

      const key = match[1].trim().toLowerCase();
      const value = match[2]
        .trim()
        .toLowerCase()
        .replace(/[‘’]/gu, "'")
        .normalize('NFD')
        .replace(/[̀-ͯ]/gu, '');

      if (value && !specs[key]) {
        specs[key] = value;
      }
    });

    const originText = specs.origin || '';
    const [countryText, ...regionParts] = originText.split(/\s*[-–]\s*/u);
    const regionText = regionParts.join(' ').trim();

    const originCountryId =
      originCountries.find(({ name }) => name === countryText.trim())?.origin_country_id ||
      originCountries.find(({ name }) => countryText.includes(name))?.origin_country_id ||
      null;

    if (!originCountryId) {
      logger.error(`No origin country found for ${url}`);

      throw new Error(errors.originCountryMissing);
    }

    const originRegionId =
      originRegions.find(({ name }) => name === regionText)?.origin_region_id ||
      originRegions.find(({ name }) => regionText.includes(name))?.origin_region_id ||
      null;

    if (!originRegionId) {
      logger.info(`Missing origin region: ${regionText}`);
    }

    const farmText = specs.farm || '';
    const producerText = specs.producer || '';
    const originFarmId =
      originFarms.find(({ name }) => name === farmText)?.id ||
      originFarms.find(({ name }) => farmText.includes(name))?.id ||
      originFarms.find(({ name }) => producerText.includes(name))?.id ||
      originFarms.find(({ name }) => title.includes(name))?.id ||
      null;

    const processingText = specs.process || '';
    const sortedProcessingMethods = [...processingMethods].sort((a, b) => b.name.length - a.name.length);
    const processingMethodId =
      sortedProcessingMethods.find(({ name }) => name === processingText)?.processing_method_id ||
      sortedProcessingMethods.find(({ name }) => processingText.includes(name))?.processing_method_id ||
      null;

    if (!processingMethodId) {
      logger.info(`Missing processing method: ${processingText}`);
    }

    const varietyText = specs.variety || '';
    const varietyStrings = varietyText
      .split(/[,/&+]|\s+-\s+/u)
      .map((s) => s.trim())
      .filter(Boolean);
    const varietyIds = Array.from(
      new Set(
        varieties
          .filter(({ name, alias }) =>
            varietyStrings.some(
              (s) =>
                name.toLowerCase() === s ||
                (alias && alias.toLowerCase() === s) ||
                s.includes(name.toLowerCase()) ||
                (alias && s.includes(alias.toLowerCase()))
            )
          )
          .map(({ id }) => id)
      )
    );

    if (!varietyIds.length) {
      logger.info(`Missing varieties: ${varietyStrings}`);
    }

    const brewingMethodId = brewingMethods.find(({ name }) => name === 'omni')?.brewing_method_id || null;

    const tasteNoteIds = [];

    const isDecaf = url.includes('decaf') || title.includes('decaf');

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
  // Manhattan
  305: ({ html, url, roasterId }) => {
    logger.info(`Parsing item page: ${url}`);

    const document = getDocument(html);

    const variationsData = document.querySelector('.variations_form')?.dataset?.product_variations;

    if (!variationsData) {
      logger.error(`No variation data found for ${url}`);

      throw new Error(errors.detailsMissing);
    }

    const variations = JSON.parse(variationsData);
    const availableVariants = variations
      .filter((v) => v.is_in_stock)
      .sort((a, b) => parseFloat(a.weight) - parseFloat(b.weight));

    if (!availableVariants.length) {
      logger.info(`Out of stock for ${url}`);

      return { isOutOfStock: true };
    }

    const smallestVariant = availableVariants[0];
    const price = Number(smallestVariant.display_price.toFixed(2));
    const weight = Number(smallestVariant.weight) * 1000;

    if (!price || isNaN(price)) {
      logger.error(`No price found for ${url}`);

      throw new Error(errors.priceMissing);
    }

    if (!weight || isNaN(weight)) {
      logger.error(`No weight found for ${url}`);

      throw new Error(errors.weightMissing);
    }

    const currency = 'EUR';
    const pricePerGram = Number((price / weight).toFixed(2));

    const originText =
      document.querySelector('.product-drilldown__content--info__location')?.textContent.trim().toLowerCase() || '';

    if (originText.includes('&')) {
      return { isBlend: true };
    }

    const originCountryId =
      originCountries.find(({ name }) => name === originText)?.origin_country_id ||
      originCountries.find(({ name }) => originText.includes(name))?.origin_country_id ||
      null;

    if (!originCountryId) {
      logger.error(`No origin country found for ${url}`);

      throw new Error(errors.originCountryMissing);
    }

    const details = Array.from(document.querySelectorAll('.product-drilldown__content--detail')).reduce(
      (_details, element) => {
        const key = element.querySelector('.detail-label')?.textContent.trim().toLowerCase();
        const value = element.querySelector('.detail-value')?.textContent.trim().toLowerCase();

        if (key && value) {
          _details[key] = value;
        }

        return _details;
      },
      {}
    );

    const regionText = details.region || '';
    const originRegionId = originRegions.find(({ name }) => regionText.includes(name))?.origin_region_id || null;

    if (!originRegionId) {
      logger.info(`Missing origin region: ${regionText}`);
    }

    const farmText = details.farm || '';
    const title = document.querySelector('h1.product_title')?.textContent.trim().toLowerCase() || '';
    const originFarmId =
      originFarms.find(({ name }) => name === farmText)?.id ||
      originFarms.find(({ name }) => farmText.includes(name))?.id ||
      originFarms.find(({ name }) => title.includes(name))?.id ||
      null;

    const processingText = details.processing || '';
    const sortedProcessingMethods = [...processingMethods].sort((a, b) => b.name.length - a.name.length);
    const processingMethodId =
      sortedProcessingMethods.find(({ name }) => name === processingText)?.processing_method_id ||
      sortedProcessingMethods.find(({ name }) => processingText.includes(name))?.processing_method_id ||
      null;

    if (!processingMethodId) {
      logger.info(`Missing processing method: ${processingText}`);
    }

    const varietyText = details.variety || '';
    const varietyStrings = varietyText
      .split(/[,/&\n]/u)
      .map((s) => s.trim())
      .filter(Boolean);
    const varietyIds = Array.from(
      new Set(
        varieties
          .filter(({ name, alias }) =>
            varietyStrings.some((s) => name.toLowerCase() === s || (alias && alias.toLowerCase() === s))
          )
          .map(({ id }) => id)
      )
    );

    if (!varietyIds.length) {
      logger.info(`Missing varieties: ${varietyStrings}`);
    }

    const tasteNotesElement = document.querySelector('.product-drilldown__content--info__tastes-like .subtitle');
    const tasteNoteStrings = (tasteNotesElement?.textContent || '')
      .toLowerCase()
      .split(/[•\n]/u)
      .map((s) => s.trim().replace(/\.$/u, ''))
      .filter(Boolean);
    const tasteNoteIds = Array.from(
      new Set(
        tasteNoteStrings
          .map(
            (note) =>
              tasteNotes.find(({ name }) => name === note)?.taste_note_id ||
              tasteNotes.find(({ name }) => note.includes(name))?.taste_note_id
          )
          .filter(Boolean)
      )
    );

    if (!tasteNoteIds.length) {
      logger.info(`Missing taste notes: ${tasteNoteStrings}`);
    }

    const roastedForValues = new Set(
      availableVariants.map((v) => v.attributes['attribute_pa_roasted-for']).filter(Boolean)
    );
    const isEspresso = roastedForValues.has('espresso');
    const isFilter = roastedForValues.has('filter');
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

    const isDecaf = url.includes('decaf') || title.includes('decaf');

    const image =
      smallestVariant.image?.full_src ||
      smallestVariant.image?.url ||
      smallestVariant.image?.src ||
      document.querySelector('.woocommerce-product-gallery__image img')?.src ||
      document.querySelector('.wp-post-image')?.src;

    if (!image) {
      logger.error(`No image found for ${url}`);

      throw new Error(errors.imageMissing);
    }

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
  // naughty dog
  310: ({ html, url, roasterId }) => {
    logger.info(`Parsing webshop item page ${url}`);

    const document = getDocument(html);

    const title = document.querySelector('h1')?.textContent.trim().toLowerCase() || '';

    const ldScript = document.querySelector('script[type="application/ld+json"]');
    const ld = ldScript ? JSON.parse(ldScript.textContent) : {};

    if (ld.offers?.availability && !ld.offers.availability.toLowerCase().includes('instock')) {
      logger.info(`Out of stock for ${url}`);

      return { isOutOfStock: true };
    }

    const price = Number(document.querySelector('#product_price')?.value || ld.offers?.price);

    if (!price || isNaN(price)) {
      logger.error(`No price found for ${url}`);

      throw new Error(errors.priceMissing);
    }

    const currency = ld.offers?.priceCurrency;

    if (!currency) {
      logger.error(`No currency found for ${url}`);

      throw new Error(errors.currencyMissing);
    }

    const unitText = document.querySelector('#product_unit')?.value || '';
    const weightMatch = unitText.match(/(\d+)\s*(kg|g)/i);
    const weight = weightMatch ? Number(weightMatch[1]) * (weightMatch[2].toLowerCase() === 'kg' ? 1000 : 1) : null;

    if (!weight || isNaN(weight)) {
      logger.error(`No weight found for ${url}`);

      throw new Error(errors.weightMissing);
    }

    const pricePerGram = Number((price / weight).toFixed(2));

    const image = ld.image;

    if (!image) {
      logger.error(`No image found for ${url}`);

      throw new Error(errors.imageMissing);
    }

    const specs = {};

    document.querySelectorAll('table tr').forEach((row) => {
      const cells = row.querySelectorAll('td');

      if (cells.length === 2) {
        const labelEl = cells[1].querySelector('.xs_product_parameter_item_title');
        const label = labelEl?.textContent.trim().toLowerCase();

        if (!label) {
          return;
        }

        const valueClone = cells[1].cloneNode(true);
        const titleDiv = valueClone.querySelector('.xs_product_parameter_item_title');

        if (titleDiv) {
          titleDiv.remove();
        }

        specs[label] = valueClone.textContent.trim().toLowerCase().replace(/\s+/g, ' ');
      }
    });

    const countryText = specs['coffee origin'] || '';
    const originCountryId =
      originCountries.find(({ name }) => name === countryText)?.origin_country_id ||
      originCountries.find(({ name }) => countryText.includes(name))?.origin_country_id ||
      null;

    if (!originCountryId) {
      logger.error(`No origin country found for ${url}`);

      throw new Error(errors.originCountryMissing);
    }

    const regionText = specs.region || '';
    const originRegionId = originRegions.find(({ name }) => regionText.includes(name))?.origin_region_id || null;

    if (!originRegionId) {
      logger.info(`Missing origin region: ${regionText}`);
    }

    const originFarmId =
      originFarms.find(({ name }) => title.includes(name))?.id ||
      originFarms.find(({ name }) => regionText.includes(name))?.id ||
      null;

    const processingText = specs.process || '';
    const sortedProcessingMethods = [...processingMethods].sort((a, b) => b.name.length - a.name.length);
    const processingMethodId =
      sortedProcessingMethods.find(({ name }) => name === processingText)?.processing_method_id ||
      sortedProcessingMethods.find(({ name }) => processingText.includes(name))?.processing_method_id ||
      null;

    if (!processingMethodId) {
      logger.info(`Missing processing method: ${processingText}`);
    }

    const varietyText = specs.variety || '';
    const varietyStrings = varietyText
      .split(/[,/&+]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const varietyIds = Array.from(
      new Set(
        varieties
          .filter(
            ({ name, alias }) =>
              varietyStrings.includes(name.toLowerCase()) ||
              (alias && varietyStrings.includes(alias.toLowerCase())) ||
              (name.toLowerCase() === 'caturra' && varietyStrings.includes('cattura')) // typo
          )
          .map(({ id }) => id)
      )
    );

    if (!varietyIds.length) {
      logger.info(`Missing varieties: ${varietyStrings}`);
    }

    const tasteNotesText = specs['flavour profile'] || specs['flavor profile'] || '';
    const tasteNoteStrings = tasteNotesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const tasteNoteIds = Array.from(
      new Set(
        tasteNoteStrings.map((note) => tasteNotes.find(({ name }) => name === note)?.taste_note_id).filter(Boolean)
      )
    );

    if (!tasteNoteIds.length) {
      logger.info(`Missing taste notes: ${tasteNoteStrings}`);
    }

    const roastType = specs['roast type'] || '';
    const isOmni = roastType.includes('omni');
    const isEspresso = roastType.includes('espresso') && !isOmni;
    const isFilter = roastType.includes('filter') && !isOmni;
    const brewingMethodId =
      brewingMethods.find(
        ({ name }) =>
          (isOmni && name === 'omni') || (isEspresso && name === 'espresso') || (isFilter && name === 'filter')
      )?.brewing_method_id || brewingMethods.find(({ name }) => name === 'omni').brewing_method_id;

    const isDecaf = url.includes('decaf') || title.includes('decaf');

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
  // Doubleshot
  311: ({ html, url, roasterId }) => {
    logger.info(`Parsing webshop item page ${url}`);

    const document = getDocument(html);

    const title = (document.querySelector('h1')?.textContent.trim() || '').toLowerCase();
    const headerBarItems = Array.from(document.querySelectorAll('.productPage-header-bar-item')).map((el) =>
      el.textContent.replace(/\s+/g, ' ').trim()
    );
    const countryText = (headerBarItems[0] || '').toLowerCase();

    if (countryText.includes('&') || countryText.includes(',')) {
      return { isBlend: true };
    }

    const variants = Array.from(document.querySelectorAll('.productPrice-price[data-variant]'))
      .filter((el) => !el.getAttribute('data-variant').includes('_recurrent'))
      .map((el) => {
        const priceCents = Number(el.getAttribute('data-variant-pricecents'));
        const packaging = el.getAttribute('data-option-packaging') || '';
        const weightMatch = packaging.match(/(\d+)\s*(kg|g)/iu);
        const variantWeight = weightMatch
          ? Number(weightMatch[1]) * (weightMatch[2].toLowerCase() === 'kg' ? 1000 : 1)
          : null;

        return { priceCents, weight: variantWeight };
      })
      .filter(({ weight: w, priceCents }) => w && priceCents > 0);

    if (!variants.length) {
      return { isOutOfStock: true };
    }

    const smallest = [...variants].sort((a, b) => a.weight - b.weight)[0];
    const price = Number((smallest.priceCents / 100).toFixed(2));
    const weight = smallest.weight;

    if (!price || isNaN(price)) {
      logger.error(`No price found for ${url}`);

      throw new Error(errors.priceMissing);
    }

    if (!weight || isNaN(weight)) {
      logger.error(`No weight found for ${url}`);

      throw new Error(errors.weightMissing);
    }

    const pricePerGram = Number((price / weight).toFixed(2));

    const currencyScript = Array.from(document.querySelectorAll('script')).find((s) =>
      /currencyCode:\s*['"][^'"]+['"]/u.test(s.textContent)
    );
    const currency = currencyScript?.textContent.match(/currencyCode:\s*['"]([^'"]+)['"]/u)?.[1].toUpperCase() || null;

    if (!currency) {
      logger.error(`No currency found for ${url}`);

      throw new Error(errors.currencyMissing);
    }

    const originCountryId =
      originCountries.find(({ name }) => name === countryText)?.origin_country_id ||
      originCountries.find(({ name }) => countryText.includes(name))?.origin_country_id ||
      null;

    if (!originCountryId) {
      logger.error(`No origin country found for ${url}`);

      throw new Error(errors.originCountryMissing);
    }

    const image =
      Array.from(document.querySelectorAll('.productPage img'))
        .map((el) => el.src)
        .find((src) => src && src.startsWith('https://img.doubleshot.cz/')) || null;

    if (!image) {
      logger.error(`No image found for ${url}`);

      throw new Error(errors.imageMissing);
    }

    const sections = {};

    document.querySelectorAll('details.accordion-item').forEach((el) => {
      const header = el.querySelector('.accordion-header')?.textContent.replace(/\s+/g, ' ').trim().toLowerCase();
      const key = header?.split(' ')[0];
      const content = el.querySelector('.accordion-content')?.textContent.replace(/\s+/g, ' ').trim() || '';

      if (key) {
        sections[key] = content;
      }
    });

    const originText = (sections.origin || '').toLowerCase();
    const processingText = (sections.processing || sections.variety || '').toLowerCase();
    const brewingText = (sections.brewing || '').toLowerCase();
    const flavourText = (sections.flavour || '').toLowerCase();

    const originRegionId =
      originRegions
        .filter(({ origin_country_id }) => origin_country_id === originCountryId)
        .find(({ name }) => originText.includes(name))?.origin_region_id || null;

    if (!originRegionId) {
      logger.info(`Missing origin region: ${originText}`);
    }

    const originFarmId =
      originFarms.find(({ name }) => originText.includes(name.toLowerCase()))?.id ||
      originFarms.find(({ name }) => title.includes(name.toLowerCase()))?.id ||
      null;

    const isEspresso = url.toLowerCase().includes('espresso') || /\b\d+-\d+\s*seconds\b/u.test(brewingText);
    const isFilter =
      url.toLowerCase().includes('filter') ||
      /single[- ]origin filter/u.test(`${flavourText} ${processingText} ${originText}`) ||
      /extraction time:\s*approx\.?\s*\d+\s*min/u.test(brewingText);
    const brewingMethodId =
      brewingMethods.find(
        ({ name }) =>
          (isFilter && isEspresso && name === 'omni') ||
          (isFilter && !isEspresso && name === 'filter') ||
          (isEspresso && !isFilter && name === 'espresso')
      )?.brewing_method_id || null;

    const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
    const varietyIds = Array.from(
      new Set(
        varieties
          .filter(({ name, alias }) => {
            const nameRe = new RegExp(`(?<!\\p{L})${escapeRegex(name.toLowerCase())}(?!\\p{L})`, 'iu');
            const aliasRe = alias ? new RegExp(`(?<!\\p{L})${escapeRegex(alias.toLowerCase())}(?!\\p{L})`, 'iu') : null;

            return nameRe.test(processingText) || (aliasRe && aliasRe.test(processingText));
          })
          .map(({ id }) => id)
      )
    );

    if (!varietyIds.length) {
      logger.info(`Missing varieties: ${processingText}`);
    }

    const sortedProcessingMethods = [...processingMethods].sort((a, b) => b.name.length - a.name.length);
    const processingMethodId =
      sortedProcessingMethods.find(({ name }) => processingText.includes(name))?.processing_method_id || null;

    if (!processingMethodId) {
      logger.info(`Missing processing method: ${processingText}`);
    }

    const sortedTasteNotes = [...tasteNotes]
      .filter(({ language_code }) => language_code === 'en')
      .sort((a, b) => b.name.length - a.name.length);
    const tasteNoteIds = Array.from(
      new Set(
        sortedTasteNotes
          .filter(({ name }) => name && flavourText.includes(name.toLowerCase()))
          .map(({ taste_note_id }) => taste_note_id)
      )
    );

    if (!tasteNoteIds.length) {
      logger.info(`Missing taste notes: ${flavourText}`);
    }

    const isDecaf =
      url.toLowerCase().includes('decaf') || title.includes('decaf') || processingText.includes('decaffeinat');

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
  // Mia
  312: ({ html, url, roasterId }) => {
    logger.info(`Parsing webshop item page ${url}`);

    const document = getDocument(html);

    const ldScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    const productLd = ldScripts
      .map((script) => {
        try {
          return JSON.parse(script.textContent);
        } catch {
          return null;
        }
      })
      .find((data) => data?.['@type'] === 'Product');

    if (!productLd) {
      logger.error(`No product data found for ${url}`);

      throw new Error(errors.detailsMissing);
    }

    const availability = productLd.offers?.availability || '';

    if (availability && !availability.includes('InStock')) {
      return { isOutOfStock: true };
    }

    const title = (document.querySelector('h1.product-detail__info-title')?.textContent || '').trim().toLowerCase();

    if (url.toLowerCase().includes('blend') || title.includes('blend')) {
      return { isBlend: true };
    }

    const subtitle = (document.querySelector('h2.product-detail__info-subtitle')?.textContent || '')
      .trim()
      .toLowerCase();

    const weightMatch = subtitle.match(/(\d+(?:[.,]\d+)?)\s*(kg|g)\b/iu);
    const weight = weightMatch
      ? (weightMatch[2].toLowerCase() === 'kg' ? 1000 : 1) * Number(weightMatch[1].replace(',', '.'))
      : null;

    if (!weight || isNaN(weight)) {
      logger.error(`No weight found for ${url}`);

      throw new Error(errors.weightMissing);
    }

    const price = productLd.offers?.price ? Number(Number(productLd.offers.price).toFixed(2)) : null;

    if (!price || isNaN(price)) {
      logger.error(`No price found for ${url}`);

      throw new Error(errors.priceMissing);
    }

    const pricePerGram = Number((price / weight).toFixed(2));
    const currency = productLd.offers?.priceCurrency || null;

    if (!currency) {
      logger.error(`No currency found for ${url}`);

      throw new Error(errors.currencyMissing);
    }

    const image = Array.isArray(productLd.image) ? productLd.image[0]?.url : productLd.image;

    if (!image) {
      logger.error(`No image found for ${url}`);

      throw new Error(errors.imageMissing);
    }

    const specs = {};

    document
      .querySelectorAll('.product-detail__info-params:not(.product-detail__info-params--dots) > div')
      .forEach((block) => {
        const spans = block.querySelectorAll('span');

        if (spans.length >= 2) {
          const key = spans[0].textContent.trim().toLowerCase();
          const value = spans[1].textContent.trim().toLowerCase();

          if (key && value) {
            specs[key] = value;
          }
        }
      });

    const countryText = specs['country of origin'] || '';
    const countryFirstSegment = countryText.split(/[,/]/u)[0].trim();
    const titleFirstSegment = title.split(/[,/]/u)[0].trim();
    const sortedCountries = [...originCountries].sort((a, b) => b.name.length - a.name.length);
    const originCountryId =
      sortedCountries.find(({ name }) => name.toLowerCase() === countryFirstSegment)?.origin_country_id ||
      sortedCountries.find(({ name }) => name.toLowerCase() === titleFirstSegment)?.origin_country_id ||
      sortedCountries.find(({ name }) => countryText.includes(name.toLowerCase()))?.origin_country_id ||
      sortedCountries.find(({ name }) => title.includes(name.toLowerCase()))?.origin_country_id ||
      null;

    if (!originCountryId) {
      logger.error(`No origin country found for ${url}`);

      throw new Error(errors.originCountryMissing);
    }

    const regionText = countryText
      .replace(countryFirstSegment, '')
      .replace(/^[,/\s]+/u, '')
      .trim();
    const sortedRegions = originRegions
      .filter(({ origin_country_id: countryId }) => countryId === originCountryId) // eslint-disable-line camelcase
      .sort((a, b) => b.name.length - a.name.length);
    const originRegionId =
      sortedRegions.find(({ name }) => regionText.includes(name.toLowerCase()))?.origin_region_id || null;

    if (!originRegionId && regionText) {
      logger.info(`Missing origin region: ${regionText}`);
    }

    const sortedFarms = [...originFarms].sort((a, b) => b.name.length - a.name.length);
    const originFarmId =
      sortedFarms.find(({ name }) => title.includes(name.toLowerCase()))?.id ||
      sortedFarms.find(({ name }) => regionText.includes(name.toLowerCase()))?.id ||
      null;

    const processingText = specs.processing || '';
    const sortedProcessingMethods = [...processingMethods].sort((a, b) => b.name.length - a.name.length);
    const processingMethodId =
      sortedProcessingMethods.find(({ name }) => name.toLowerCase() === processingText)?.processing_method_id ||
      sortedProcessingMethods.find(({ name }) => processingText.includes(name.toLowerCase()))?.processing_method_id ||
      sortedProcessingMethods.find(({ name }) => processingText === 'dry' && name.toLowerCase() === 'natural')
        ?.processing_method_id ||
      null;

    if (!processingMethodId && processingText) {
      logger.info(`Missing processing method: ${processingText}`);
    }

    const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
    const varietyText = specs.variety || '';
    const varietyIds = Array.from(
      new Set(
        varieties
          .filter(({ name, alias }) => {
            const nameRe = new RegExp(`(?<!\\p{L})${escapeRegex(name.toLowerCase())}(?!\\p{L})`, 'iu');
            const aliasRe = alias ? new RegExp(`(?<!\\p{L})${escapeRegex(alias.toLowerCase())}(?!\\p{L})`, 'iu') : null;

            return nameRe.test(varietyText) || (aliasRe && aliasRe.test(varietyText));
          })
          .map(({ id }) => id)
      )
    );

    if (!varietyIds.length && varietyText) {
      logger.info(`Missing varieties: ${varietyText}`);
    }

    const tasteNotesText = specs['flavor characteristic'] || '';
    const tasteNoteList = tasteNotesText
      .split(/[,/]/u)
      .map((note) => note.trim())
      .filter(Boolean);
    const sortedTasteNotes = [...tasteNotes].sort((a, b) => b.name.length - a.name.length);
    const tasteNoteIds = Array.from(
      new Set(
        sortedTasteNotes
          .filter(({ name, alias }) => {
            const nameLower = name.toLowerCase();
            const aliasLower = alias ? alias.toLowerCase() : null;

            return tasteNoteList.some(
              (note) => note === nameLower || (aliasLower && note === aliasLower) || note.includes(nameLower)
            );
          })
          .map(({ taste_note_id: id }) => id)
      )
    );

    if (!tasteNoteIds.length && tasteNotesText) {
      logger.info(`Missing taste notes: ${tasteNotesText}`);
    }

    const brewMethodText = specs['brew method'] || '';
    const isEspresso = brewMethodText.includes('espresso');
    const isFilter = brewMethodText.includes('filter') || brewMethodText.includes('filtr');
    const isOmni = isEspresso && isFilter;
    const brewingMethodId =
      brewingMethods.find(
        ({ name }) =>
          (isOmni && name === 'omni') ||
          (!isOmni && isEspresso && name === 'espresso') ||
          (!isOmni && isFilter && name === 'filter')
      )?.brewing_method_id || null;

    const isDecaf =
      url.toLowerCase().includes('decaf') ||
      title.includes('decaf') ||
      processingText.includes('decaf') ||
      subtitle.includes('caffeine-free');

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
  // Serce Kawy
  314: ({ html, url, roasterId }) => {
    logger.info(`Parsing webshop item page ${url}`);

    const document = getDocument(html);

    const title = (document.querySelector('h1')?.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();

    const ldScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
    const ldData = ldScripts
      .map((script) => {
        try {
          return JSON.parse(script.textContent);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const productOffer = ldData.find((d) => d?.offers?.price)?.offers;
    const availability = ldData.find((d) => d?.offers?.availability)?.offers?.availability || '';
    const imageData = ldData.find((d) => Array.isArray(d?.image));
    const descriptionLower = (document.querySelector('.product-description__content')?.textContent || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    if (availability && !availability.includes('InStock')) {
      return { isOutOfStock: true };
    }

    const variantWeights = Array.from(document.querySelectorAll('input[type="radio"][data-user-value]'))
      .map((input) => {
        const value = (input.getAttribute('data-user-value') || '').toLowerCase();
        const match = value.match(/(\d+(?:[.,]\d+)?)\s*(kg|g)/iu);

        if (!match) {
          return null;
        }

        const num = Number(match[1].replace(',', '.'));

        return match[2].toLowerCase() === 'kg' ? num * 1000 : num;
      })
      .filter((w) => w && !isNaN(w));

    const weight = variantWeights.length ? Math.min(...variantWeights) : null;

    if (!weight) {
      logger.error(`No weight found for ${url}`);

      throw new Error(errors.weightMissing);
    }

    const price = productOffer?.price ? Number(Number(productOffer.price).toFixed(2)) : null;

    if (!price || isNaN(price)) {
      logger.error(`No price found for ${url}`);

      throw new Error(errors.priceMissing);
    }

    const pricePerGram = Number((price / weight).toFixed(2));

    const currency = productOffer?.priceCurrency || null;

    if (!currency) {
      logger.error(`No currency found for ${url}`);

      throw new Error(errors.currencyMissing);
    }

    const image = imageData?.image?.[0] || null;

    if (!image) {
      logger.error(`No image found for ${url}`);

      throw new Error(errors.imageMissing);
    }

    const attributes = {};

    document.querySelectorAll('li.product-attributes__attribute').forEach((li) => {
      const name = li.querySelector('.product-attributes__attribute-name')?.textContent.trim().toLowerCase();
      const value = li.querySelector('.product-attributes__attribute-value')?.textContent.trim().toLowerCase();

      if (name && value) {
        attributes[name] = value;
      }
    });

    const sortedCountries = [...originCountries].sort((a, b) => b.name.length - a.name.length);
    const originCountryId =
      sortedCountries.find(({ name }) => descriptionLower.includes(name.toLowerCase()))?.origin_country_id || null;

    if (!originCountryId) {
      logger.error(`No origin country found for ${url}`);

      throw new Error(errors.originCountryMissing);
    }

    const regionText = attributes.region || '';
    const originRegionId =
      originRegions
        .filter(({ origin_country_id: countryId }) => countryId === originCountryId) // eslint-disable-line camelcase
        .find(({ name }) => regionText.includes(name.toLowerCase()))?.origin_region_id || null;

    if (!originRegionId) {
      logger.info(`Missing origin region: ${regionText}`);
    }

    const farmText = attributes.producent || '';
    const originFarmId =
      originFarms.find(({ name }) => farmText.includes(name.toLowerCase()))?.id ||
      originFarms.find(({ name }) => descriptionLower.includes(name.toLowerCase()))?.id ||
      null;

    const processingText = attributes['metoda obróbki'] || '';
    const sortedProcessingMethods = [...processingMethods].sort((a, b) => b.name.length - a.name.length);
    const processingMethodId =
      sortedProcessingMethods.find(({ name }) => processingText === name.toLowerCase())?.processing_method_id ||
      sortedProcessingMethods.find(({ name }) => processingText.includes(name.toLowerCase()))?.processing_method_id ||
      null;

    if (!processingMethodId) {
      logger.info(`Missing processing method: ${processingText}`);
    }

    const tasteNotesText = attributes['nuty smakowe'] || '';
    const sortedTasteNotes = [...tasteNotes].sort((a, b) => b.name.length - a.name.length);
    const tasteNoteIds = Array.from(
      new Set(
        sortedTasteNotes
          .filter(
            ({ name, alias }) =>
              tasteNotesText.includes(name.toLowerCase()) || (alias && tasteNotesText.includes(alias.toLowerCase()))
          )
          .map(({ taste_note_id: id }) => id)
      )
    );

    if (!tasteNoteIds.length) {
      logger.info(`Missing taste notes: ${tasteNotesText}`);
    }

    const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
    const varietyIds = Array.from(
      new Set(
        varieties
          .filter(({ name, alias }) => {
            const nameRe = new RegExp(`(?<!\\p{L})${escapeRegex(name.toLowerCase())}(?!\\p{L})`, 'iu');
            const aliasRe = alias ? new RegExp(`(?<!\\p{L})${escapeRegex(alias.toLowerCase())}(?!\\p{L})`, 'iu') : null;

            return nameRe.test(descriptionLower) || (aliasRe && aliasRe.test(descriptionLower));
          })
          .map(({ id }) => id)
      )
    );

    if (!varietyIds.length) {
      logger.info(`Missing varieties: ${descriptionLower}`);
    }

    const isEspresso = url.toLowerCase().includes('espresso') || title.includes('espresso');
    const isFilter = url.toLowerCase().includes('filter') || title.includes('filter') || title.includes('filtr');
    const isOmni = url.toLowerCase().includes('omni') || title.includes('omni');
    const brewingMethodId =
      brewingMethods.find(
        ({ name }) =>
          (isOmni && name === 'omni') ||
          (!isOmni && isEspresso && isFilter && name === 'omni') ||
          (!isOmni && isEspresso && !isFilter && name === 'espresso') ||
          (!isOmni && !isEspresso && isFilter && name === 'filter')
      )?.brewing_method_id || null;

    const isDecaf =
      url.toLowerCase().includes('decaf') ||
      title.includes('decaf') ||
      descriptionLower.includes('decaf') ||
      descriptionLower.includes('bezkofeinow');

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
  // BeBerry
  315: async ({ html, url, roasterId }) => {
    logger.info(`Parsing webshop item page ${url}`);

    const document = getDocument(html);

    const variationsRaw = document.querySelector('form.variations_form')?.dataset?.product_variations;

    if (!variationsRaw) {
      logger.error(`No variations data found for ${url}`);

      throw new Error(errors.detailsMissing);
    }

    const variations = JSON.parse(variationsRaw);

    const parseWeight = (value) => {
      const match = (value || '').toLowerCase().match(/(\d+(?:[.,]\d+)?)\s*(kg|g)/iu);

      if (!match) {
        return null;
      }

      const num = Number(match[1].replace(',', '.'));

      return match[2] === 'kg' ? num * 1000 : num;
    };

    const inStockVariants = variations
      .filter((variation) => variation.is_in_stock && variation.is_purchasable)
      .map((variation) => ({
        ...variation,
        parsedWeight: parseWeight(variation.attributes?.attribute_pa_hmotnost)
      }))
      .filter((variation) => variation.parsedWeight)
      .sort((a, b) => a.parsedWeight - b.parsedWeight);

    if (!inStockVariants.length) {
      return { isOutOfStock: true };
    }

    const smallestVariant = inStockVariants[0];

    const weight = smallestVariant.parsedWeight;
    const price = Number(Number(smallestVariant.display_price).toFixed(2));

    if (!price || isNaN(price)) {
      logger.error(`No price found for ${url}`);

      throw new Error(errors.priceMissing);
    }

    const pricePerGram = Number((price / weight).toFixed(2));
    const currency = 'CZK';

    const image =
      smallestVariant.image?.url || document.querySelector('.woocommerce-product-gallery img.wp-post-image')?.src;

    if (!image) {
      logger.error(`No image found for ${url}`);

      throw new Error(errors.imageMissing);
    }

    const decode = (text) => (text || '').replace(/&nbsp;/giu, ' ').replace(/&amp;/giu, '&');

    const titleMain = decode(document.querySelector('.product-detail__title-main')?.textContent || '')
      .trim()
      .toLowerCase();
    const titleSub = decode(document.querySelector('.product-detail__title-sub')?.textContent || '')
      .trim()
      .toLowerCase();
    const fullTitle = `${titleMain} ${titleSub}`.trim();

    const attributes = {};

    document.querySelectorAll('.product-detail__content .product-attribute').forEach((node) => {
      const label = decode(node.querySelector('.product-attribute__label')?.textContent || '')
        .trim()
        .toLowerCase();
      const value = decode(node.querySelector('.product-attribute__value')?.textContent || '')
        .trim()
        .toLowerCase();

      if (label && value) {
        attributes[label] = value;
      }
    });

    const sortedCountries = [...originCountries].sort((a, b) => b.name.length - a.name.length);
    const originCountryId =
      sortedCountries.find(({ name }) => titleMain === name.toLowerCase())?.origin_country_id ||
      sortedCountries.find(({ name }) => fullTitle.includes(name.toLowerCase()))?.origin_country_id ||
      null;

    if (!originCountryId) {
      logger.error(`No origin country found for ${url}`);

      throw new Error(errors.originCountryMissing);
    }

    const regionText = attributes.region || '';
    const farmText = attributes.farma || '';
    const farmerText = attributes['farmář'] || attributes.farmar || '';

    const sortedRegions = originRegions
      .filter(({ origin_country_id: countryId }) => countryId === originCountryId) // eslint-disable-line camelcase
      .sort((a, b) => b.name.length - a.name.length);
    const originRegionId =
      sortedRegions.find(({ name }) => regionText.includes(name.toLowerCase()))?.origin_region_id || null;

    if (!originRegionId && regionText) {
      logger.info(`Missing origin region: ${regionText}`);
    }

    const sortedFarms = [...originFarms].sort((a, b) => b.name.length - a.name.length);
    const originFarmId =
      sortedFarms.find(({ name }) => farmText.includes(name.toLowerCase()))?.id ||
      sortedFarms.find(({ name }) => farmerText.includes(name.toLowerCase()))?.id ||
      null;

    const processingTextCs = attributes['zpracování'] || attributes.zpracovani || '';
    const translatedProcessing = processingTextCs
      ? (await translate({ text: processingTextCs, from: 'cs', to: 'en' })).trim().toLowerCase()
      : '';
    const sortedProcessingMethods = [...processingMethods].sort((a, b) => b.name.length - a.name.length);
    const processingMethodId =
      sortedProcessingMethods.find(({ name }) => name.toLowerCase() === processingTextCs)?.processing_method_id ||
      sortedProcessingMethods.find(({ name }) => name.toLowerCase() === translatedProcessing)?.processing_method_id ||
      sortedProcessingMethods.find(({ name }) => translatedProcessing.includes(name.toLowerCase()))
        ?.processing_method_id ||
      sortedProcessingMethods.find(({ name }) => translatedProcessing === 'dry' && name.toLowerCase() === 'natural')
        ?.processing_method_id ||
      null;

    if (!processingMethodId && processingTextCs) {
      logger.info(`Missing processing method: ${processingTextCs} (translated: ${translatedProcessing})`);
    }

    const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
    const varietyText = (attributes['odrůda'] || attributes.odruda || '').toLowerCase();
    const varietyIds = Array.from(
      new Set(
        varieties
          .filter(({ name, alias }) => {
            const nameRe = new RegExp(`(?<!\\p{L})${escapeRegex(name.toLowerCase())}(?!\\p{L})`, 'iu');
            const aliasRe = alias ? new RegExp(`(?<!\\p{L})${escapeRegex(alias.toLowerCase())}(?!\\p{L})`, 'iu') : null;

            return nameRe.test(varietyText) || (aliasRe && aliasRe.test(varietyText));
          })
          .map(({ id }) => id)
      )
    );

    if (!varietyIds.length && varietyText) {
      logger.info(`Missing varieties: ${varietyText}`);
    }

    const tasteNotesTextCs = attributes['chuťový profil'] || attributes['chutovy profil'] || '';
    const translatedTasteNotes = tasteNotesTextCs
      ? (await translate({ text: tasteNotesTextCs, from: 'cs', to: 'en' })).toLowerCase()
      : '';
    const translatedTasteNoteList = translatedTasteNotes
      .split(',')
      .map((note) => note.trim())
      .filter(Boolean);
    const sortedTasteNotes = [...tasteNotes].sort((a, b) => b.name.length - a.name.length);
    const tasteNoteIds = Array.from(
      new Set(
        sortedTasteNotes
          .filter(({ name, alias }) => {
            const nameLower = name.toLowerCase();
            const aliasLower = alias ? alias.toLowerCase() : null;

            return translatedTasteNoteList.some(
              (note) => note === nameLower || (aliasLower && note === aliasLower) || note.includes(nameLower)
            );
          })
          .map(({ taste_note_id: id }) => id)
      )
    );

    if (!tasteNoteIds.length && tasteNotesTextCs) {
      logger.info(`Missing taste notes for ${url}: ${tasteNotesTextCs} -> ${translatedTasteNotes}`);
    }

    const categoryText = (
      document.querySelector('.product-detail__tags .product-category')?.textContent || ''
    ).toLowerCase();
    const isOmni = categoryText.includes('omni');
    const isEspresso = !isOmni && categoryText.includes('espresso');
    const isFilter = !isOmni && !isEspresso && categoryText.includes('filtr');
    const brewingMethodId =
      brewingMethods.find(
        ({ name }) =>
          (isOmni && name === 'omni') || (isEspresso && name === 'espresso') || (isFilter && name === 'filter')
      )?.brewing_method_id || null;

    const isDecaf =
      url.toLowerCase().includes('decaf') ||
      titleMain.includes('decaf') ||
      titleSub.includes('decaf') ||
      processingTextCs.includes('decaf') ||
      translatedProcessing.includes('decaf');

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
  // Leń
  317: async ({ html, url, roasterId }) => {
    logger.info(`Parsing webshop item page ${url}`);

    const document = getDocument(html);

    const variantScript = document.querySelector('script[data-js-variant-data]');

    if (!variantScript) {
      logger.error(`No variant data found for ${url}`);

      throw new Error(errors.detailsMissing);
    }

    const defaultVariant = JSON.parse(variantScript.textContent);

    const parseWeight = (value) => {
      const match = (value || '').toLowerCase().match(/(\d+(?:[.,]\d+)?)\s*(kg|g)\b/iu);

      if (!match) {
        return null;
      }

      const num = Number(match[1].replace(',', '.'));

      return match[2] === 'kg' ? num * 1000 : num;
    };

    const title = (document.querySelector('h1.product__title')?.textContent || '').trim().toLowerCase();
    const gramaturaSelect = document.querySelector('select[id*="-gramatura-"]');

    let weight, price;

    if (gramaturaSelect) {
      const variantMetafieldsScript = document.querySelector('script[data-variant-metafields-for-block]');
      const metafields = variantMetafieldsScript ? JSON.parse(variantMetafieldsScript.textContent) : {};

      const availableWeights = Array.from(gramaturaSelect.querySelectorAll('option'))
        .filter((option) => option.dataset.available === 'true')
        .map((option) => ({
          weight: parseWeight(option.value),
          variantId: option.dataset.variantId
        }))
        .filter((variant) => variant.weight)
        .sort((a, b) => a.weight - b.weight);

      if (!availableWeights.length) {
        return { isOutOfStock: true };
      }

      const smallest = availableWeights[0];

      weight = smallest.weight;
      price = metafields[smallest.variantId]?.price
        ? Number((metafields[smallest.variantId].price / 100).toFixed(2))
        : Number((defaultVariant.price / 100).toFixed(2));
    } else {
      if (!defaultVariant.available) {
        return { isOutOfStock: true };
      }

      weight = parseWeight(defaultVariant.option1) || parseWeight(title);
      price = Number((defaultVariant.price / 100).toFixed(2));
    }

    if (!weight || isNaN(weight)) {
      logger.error(`No weight found for ${url}`);

      throw new Error(errors.weightMissing);
    }

    if (!price || isNaN(price)) {
      logger.error(`No price found for ${url}`);

      throw new Error(errors.priceMissing);
    }

    const pricePerGram = Number((price / weight).toFixed(2));
    const currency = 'PLN';

    const imageRaw = document.querySelector('.product-gallery-item img')?.src;

    if (!imageRaw) {
      logger.error(`No image found for ${url}`);

      throw new Error(errors.imageMissing);
    }

    const image = imageRaw.startsWith('//') ? `https:${imageRaw}` : imageRaw;

    const specs = {};
    const specsHtml = document.querySelector('nutritional-info p')?.innerHTML || '';

    for (const line of specsHtml.split(/<br\s*\/?>/iu)) {
      const cleanLine = line.replace(/<[^>]+>/gu, '').trim();

      if (!cleanLine) {
        continue;
      }

      const commaIndex = cleanLine.indexOf(',');

      if (commaIndex < 0) {
        continue;
      }

      const key = cleanLine.slice(0, commaIndex).trim().toLowerCase();
      const value = cleanLine
        .slice(commaIndex + 1)
        .trim()
        .toLowerCase();

      if (key && value) {
        specs[key] = value;
      }
    }

    const titleFirstWord = title.split(/\s+/u)[0] || '';
    const sortedCountries = [...originCountries].sort((a, b) => b.name.length - a.name.length);
    const originCountryId =
      sortedCountries.find(({ name }) => name.toLowerCase() === titleFirstWord)?.origin_country_id ||
      sortedCountries.find(({ name }) => title.includes(name.toLowerCase()))?.origin_country_id ||
      null;

    if (!originCountryId) {
      logger.error(`No origin country found for ${url}`);

      throw new Error(errors.originCountryMissing);
    }

    const regionText = specs.region || '';
    const sortedRegions = originRegions
      .filter(({ origin_country_id: countryId }) => countryId === originCountryId) // eslint-disable-line camelcase
      .sort((a, b) => b.name.length - a.name.length);
    const originRegionId =
      sortedRegions.find(({ name }) => regionText.includes(name.toLowerCase()))?.origin_region_id || null;

    if (!originRegionId && regionText) {
      logger.info(`Missing origin region: ${regionText}`);
    }

    const sortedFarms = [...originFarms].sort((a, b) => b.name.length - a.name.length);
    const originFarmId = sortedFarms.find(({ name }) => title.includes(name.toLowerCase()))?.id || null;

    const processingTextPl = specs['obróbka'] || specs.obrobka || '';
    const translatedProcessing = processingTextPl
      ? (await translate({ text: processingTextPl, from: 'pl', to: 'en' })).trim().toLowerCase()
      : '';
    const sortedProcessingMethods = [...processingMethods].sort((a, b) => b.name.length - a.name.length);
    const processingMethodId =
      sortedProcessingMethods.find(({ name }) => name.toLowerCase() === processingTextPl)?.processing_method_id ||
      sortedProcessingMethods.find(({ name }) => name.toLowerCase() === translatedProcessing)?.processing_method_id ||
      sortedProcessingMethods.find(({ name }) => processingTextPl.includes(name.toLowerCase()))?.processing_method_id ||
      sortedProcessingMethods.find(({ name }) => translatedProcessing.includes(name.toLowerCase()))
        ?.processing_method_id ||
      null;

    if (!processingMethodId && processingTextPl) {
      logger.info(`Missing processing method: ${processingTextPl} (translated: ${translatedProcessing})`);
    }

    const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
    const varietyText = specs.odmiana || '';
    const varietyIds = Array.from(
      new Set(
        varieties
          .filter(({ name, alias }) => {
            const nameRe = new RegExp(`(?<!\\p{L})${escapeRegex(name.toLowerCase())}(?!\\p{L})`, 'iu');
            const aliasRe = alias ? new RegExp(`(?<!\\p{L})${escapeRegex(alias.toLowerCase())}(?!\\p{L})`, 'iu') : null;

            return (
              nameRe.test(varietyText) ||
              (aliasRe && aliasRe.test(varietyText)) ||
              (name.toLowerCase() === 'heirloom' && varietyText === 'hairloom') // typo
            );
          })
          .map(({ id }) => id)
      )
    );

    if (!varietyIds.length && varietyText) {
      logger.info(`Missing varieties: ${varietyText}`);
    }

    const tasteNotesTextPl = specs['profil smakowy'] || '';
    const translatedTasteNotes = tasteNotesTextPl
      ? (await translate({ text: tasteNotesTextPl, from: 'pl', to: 'en' })).toLowerCase()
      : '';
    const translatedTasteNoteList = translatedTasteNotes
      .split(',')
      .map((note) => note.trim())
      .filter(Boolean);
    const sortedTasteNotes = [...tasteNotes].sort((a, b) => b.name.length - a.name.length);
    const tasteNoteIds = Array.from(
      new Set(
        sortedTasteNotes
          .filter(({ name, alias }) => {
            const nameLower = name.toLowerCase();
            const aliasLower = alias ? alias.toLowerCase() : null;

            return translatedTasteNoteList.some(
              (note) => note === nameLower || (aliasLower && note === aliasLower) || note.includes(nameLower)
            );
          })
          .map(({ taste_note_id: id }) => id)
      )
    );

    if (!tasteNoteIds.length && tasteNotesTextPl) {
      logger.info(`Missing taste notes for ${url}: ${tasteNotesTextPl} -> ${translatedTasteNotes}`);
    }

    const brewingMethodId = brewingMethods.find(({ name }) => name === 'omni')?.brewing_method_id || null;

    const isDecaf = url.toLowerCase().includes('decaf') || title.includes('decaf');

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
  }
};

export default parsers;
