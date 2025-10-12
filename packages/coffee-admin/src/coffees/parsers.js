/* eslint-disable no-console, no-shadow, complexity */
import { JSDOM } from 'jsdom';
import { Agent } from 'undici';

import currencyCodes from './currencies.js';
import brewingMethods from '../../../coffee.chealt.com/data/brewingMethods.json' with { type: 'json' };
import originCountries from '../../../coffee.chealt.com/data/originCountries.json' with { type: 'json' };
import originFarms from '../../../coffee.chealt.com/data/originFarms.json' with { type: 'json' };
import originRegions from '../../../coffee.chealt.com/data/originRegions.json' with { type: 'json' };
import processingMethods from '../../../coffee.chealt.com/data/processingMethods.json' with { type: 'json' };
import roastingLevels from '../../../coffee.chealt.com/data/roastingLevels.json' with { type: 'json' };
import tasteNotes from '../../../coffee.chealt.com/data/tasteNotes.json' with { type: 'json' };
import varieties from '../../../coffee.chealt.com/data/varieties.json' with { type: 'json' };

const parsers = {
  // Sheep & Raven
  6: async ({ webshop }) => {
    console.info('Fetching webshop page...');

    const response = await fetch(webshop);
    const html = await response.text();

    const {
      window: { document }
    } = new JSDOM(html);

    console.info('Parsing webshop page...');

    const hiddenProductSelectors = [
      '.product_cat-akcesoria',
      '.product_cat-accessories',
      '.product_cat-warsztaty-kawowe',
      '.product_cat-workshops'
    ];
    const productLinks = document.querySelectorAll(
      `.product:not(${hiddenProductSelectors.join(',')}) .--eael-wrapper-link-tag`
    );

    const uniqueProductLinks = new Set(Array.from(productLinks).map((productLink) => productLink.href));

    const coffees = await Promise.all(
      Array.from(uniqueProductLinks).map(async (webshopItemLink) => {
        console.info(`Fetching webshop item page: ${webshopItemLink}`);

        const response = await fetch(webshopItemLink);
        const html = await response.text();

        const {
          window: { document }
        } = new JSDOM(html);

        console.info('Parsing webshop item page...');
        const price = parseFloat(
          document
            .querySelector('.price .woocommerce-Price-amount')
            .textContent.replaceAll(' zł', '')
            .replaceAll(',', '.')
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
          .filter(({ name }) => varietiesStrings.includes(name.toLowerCase()))
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
          tasteNoteIds,
          varietyIds,
          webshopItemLink,
          weight
        };
      })
    );

    return coffees;
  },
  // BeMyBean
  39: async ({ webshop }) => {
    const response = await fetch(webshop);
    const html = await response.text();

    const {
      window: { document }
    } = new JSDOM(html);

    // espresso links
    const espressoLink = document.querySelector('[data-id="5e99470"] a');

    const espressoResponse = await fetch(espressoLink.href);
    const espressoHtml = await espressoResponse.text();

    const {
      window: { document: espressoDocument }
    } = new JSDOM(espressoHtml);

    const espressoLinks = espressoDocument.querySelectorAll('.product_cat-espresso a');

    // alternative links
    const alternativeLink = document.querySelector('[data-id="cbb6602"] a');

    const alternativeResponse = await fetch(alternativeLink.href);
    const alternativeHtml = await alternativeResponse.text();

    const {
      window: { document: alternativeDocument }
    } = new JSDOM(alternativeHtml);

    const alternativeLinks = alternativeDocument.querySelectorAll('.product_cat-alternatywa a');

    const productLinks = [...espressoLinks, ...alternativeLinks];

    const uniqueProductLinks = new Set(Array.from(productLinks).map((productLink) => productLink.href));

    const coffees = await Promise.all(
      Array.from(uniqueProductLinks).map(async (webshopItemLink) => {
        console.info(`Fetching item page: ${webshopItemLink}...`);

        let itemResponse;

        try {
          itemResponse = await fetch(webshopItemLink, {
            dispatcher: new Agent({
              connectTimeout: 60 * 1000 // 1 minute
            })
          });
        } catch (error) {
          console.error(error);
          console.error(`Error fetching item page: ${webshopItemLink}`);

          return {};
        }

        const itemHtml = await itemResponse.text();

        if (itemResponse.status === 404 || itemResponse.status === 301 || itemResponse.status === 503) {
          console.error(`Error fetching item page: ${webshopItemLink}, status is: ${itemResponse.status}`);

          return {};
        }

        const {
          window: { document: itemDocument }
        } = new JSDOM(itemHtml);

        console.info(`Parsing item page: ${webshopItemLink}...`);

        const someInStock = JSON.parse(itemDocument.querySelector('.variations_form').dataset.product_variations)
          .map((product) => product.is_in_stock)
          .some(Boolean);

        if (!someInStock) {
          console.info(`All items at ${webshopItemLink} are out of stock`);

          return {};
        }

        const priceElement =
          itemDocument.querySelector('.price > *:not(del) .woocommerce-Price-amount') ||
          itemDocument.querySelector('.price .woocommerce-Price-amount');

        if (!priceElement) {
          console.debug('html: ', itemHtml);
          console.debug(
            '.woocommerce-Price-amount elements: ',
            itemDocument.querySelector('.woocommerce-Price-amount').textContent
          );

          throw new Error(`Price element not found: ${webshopItemLink}`);
        }

        const price = parseFloat(priceElement.textContent);
        console.debug(`price for ${webshopItemLink}: ${price}`);

        const currencySymbol = itemDocument.querySelector('.woocommerce-Price-currencySymbol').textContent;
        const currency = currencyCodes[currencySymbol];

        if (!currency) {
          throw new Error(`Unknown currency: ${currencySymbol}`);
        }

        const weight = Number(
          itemDocument.querySelector('#masa-netto option:not([value=""])').value.replaceAll('g', '')
        );
        console.debug(`weight for ${webshopItemLink}: ${weight}`);

        const pricePerGram = Number((price / weight).toFixed(2));

        const details = itemDocument
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

        const brewingMethodElement = itemDocument.querySelector('[data-id="a074d76"]');
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
              name ===
                processingMethod.replace(' decaf', '').replace(' / ', ' ').replace('natural natural', 'natural') ||
              (processingMethod === 'cautai, typica, bourbon, castillo' && name === 'washed') // bug in the website
          )?.processing_method_id || null;

        const tasteNotesElement = itemDocument.querySelector('[data-id="09140d8"]');
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

        const image = itemDocument.querySelector('.woocommerce-product-gallery__wrapper img').src;

        return {
          brewingMethodId,
          currency,
          image,
          isDecaf,
          originCountryId,
          originRegionId,
          originFarmId: null,
          price,
          pricePerGram,
          processingMethodId,
          tasteNoteIds,
          varietyIds,
          webshopItemLink,
          weight
        };
      })
    );

    return coffees;
  },
  // Father's (Czech)
  277: async ({ webshop }) => {
    const response = await fetch(webshop);
    const html = await response.text();

    const {
      window: { document }
    } = new JSDOM(html);

    // Filter coffee
    const filterCoffeeElements = document.querySelectorAll('.product_cat-filter.instock');
    const espressoCoffeeElements = document.querySelectorAll('.product_cat-espresso-en.instock');
    const uniqueCoffeeElements = Array.from([...filterCoffeeElements, ...espressoCoffeeElements]).reduce(
      (uniqueElements, element) => {
        const id = Array.from(element.classList)
          .filter((className) => className.startsWith('post-'))[0]
          .slice(5);

        if (!uniqueElements.some((uniqueElement) => uniqueElement.id === id)) {
          uniqueElements.push({ id, element });
        }

        return uniqueElements;
      },
      []
    );

    const uniqueProductLinks = uniqueCoffeeElements.map(({ element }) => element.querySelector('a').href);

    const coffees = await Promise.all(
      uniqueProductLinks.map(async (webshopItemLink) => {
        console.info(`Fetching item page: ${webshopItemLink}`);
        const itemResponse = await fetch(webshopItemLink);
        const itemHtml = await itemResponse.text();

        console.info(`Parsing item page: ${webshopItemLink}`);
        const {
          window: { document }
        } = new JSDOM(itemHtml);

        const price = parseFloat(
          document.querySelector('.price .woocommerce-Price-amount').textContent.replaceAll('€ ', '')
        );

        const currencySymbol = document.querySelector('.woocommerce-Price-currencySymbol').textContent;
        const currency = currencyCodes[currencySymbol];

        if (!currency) {
          throw new Error(`Unknown currency: ${currencySymbol}`);
        }

        const weightElement = document.querySelector('div[data-attribute_name="attribute_pa_vaha"] .nasa-attr-text');

        if (!weightElement) {
          console.error(`No weight found at: ${webshopItemLink}`);

          return {};
        }

        const weight = Number(weightElement.textContent.replace('g', ''));

        const pricePerGram = Number((price / weight).toFixed(2));

        let detailNames = Array.from(
          document.querySelectorAll('.woocommerce-product-details__short-description b')
        ).map((element) => element.textContent.trim().toLowerCase().replace(':', ''));

        if (detailNames.length === 0) {
          detailNames = Array.from(
            document.querySelectorAll('.woocommerce-product-details__short-description strong')
          ).map((element) => element.textContent.trim().toLowerCase().replace(':', ''));
        }

        let detailValues = Array.from(
          document.querySelectorAll('.woocommerce-product-details__short-description b')
        ).map((element) => element.nextSibling?.textContent.trim().toLowerCase());

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

        const details = detailNames.reduce((details, name, index) => ({ ...details, [name]: detailValues[index] }), {});

        if (Object.keys(details).length === 0 || !details.country) {
          console.error(`No details found at: ${webshopItemLink}`);

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

        const brewingMethod = document
          .querySelector('.br_alabel_better_compatibility')
          .textContent.trim()
          .toLowerCase();
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
          console.debug(webshopItemLink, ': ', details);
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
          tasteNoteIds,
          varietyIds,
          webshopItemLink,
          weight
        };
      })
    );

    return coffees;
  },
  // PALE
  278: async ({ webshop }) => {
    console.info('Fetching webshop page...');

    const response = await fetch(webshop);
    const html = await response.text();

    const {
      window: { document }
    } = new JSDOM(html);

    console.info('Parsing webshop page...');

    const collectProductLinks = async (document) => {
      let links = Array.from(document.querySelectorAll('.wc-block-components-product-image a')).map(
        (element) => element.href
      );
      const nextPageLink = document.querySelector('[data-wp-key="product-collection-pagination--next"]');

      if (nextPageLink) {
        const response = await fetch(nextPageLink.href);
        const html = await response.text();

        const {
          window: { document }
        } = new JSDOM(html);

        links = links.concat(await collectProductLinks(document));
      }

      return links;
    };

    const productLinks = await collectProductLinks(document);

    const coffees = await Promise.all(
      productLinks.map(async (webshopItemLink) => {
        console.info(`Fetching webshop item: ${webshopItemLink}`);

        const itemResponse = await fetch(webshopItemLink);
        const itemHtml = await itemResponse.text();

        const {
          window: { document }
        } = new JSDOM(itemHtml);

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
          throw new Error(`Unknown currency: ${webshopItemLink}`);
        }

        if (!price) {
          throw new Error(`Unknown price: ${webshopItemLink}`);
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
          console.error(`Could not find weight for product: ${webshopItemLink}`);

          return {};
        }

        const pricePerGram = Number((price / weight).toFixed(2));

        const postTitle = document.querySelector('.wp-block-post-title').textContent.toLowerCase();
        const countryRegionOrFarm = postTitle.includes(' // ') ? postTitle.split(' // ') : postTitle.split(' | ');

        let originCountryId =
          originCountries.find(({ name }) => countryRegionOrFarm.some((item) => name === item))?.origin_country_id ||
          null;

        // if everything fails, we try the URL
        if (!originCountryId) {
          originCountryId =
            originCountries.find(({ name }) => webshopItemLink.includes(name))?.origin_country_id || null;
        }

        const originFarmId =
          originFarms.find(({ name }) => countryRegionOrFarm.some((item) => name === item))?.id || null;

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

        const image = document.querySelector('.wp-post-image').src;

        const description = document.querySelector('.wp-block-post-excerpt__excerpt')?.textContent.trim().toLowerCase();
        const processingMethodId =
          processingMethods.find(({ name }) => description.includes(name))?.processing_method_id || null;

        const tasteNotesFound = tasteNotes.filter(({ name }) => description.includes(name));
        // exclude taste notes that include each other like st'raw'berry and 'raw'
        const distinctTasteNotes = tasteNotesFound.filter(
          ({ name }) => !tasteNotesFound.some(({ name: n }) => n !== name && n.includes(name))
        );

        const uniqueTasteNoteIds = Array.from(new Set(distinctTasteNotes.map(({ taste_note_id: id }) => id)));

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
          tasteNoteIds: uniqueTasteNoteIds,
          webshopItemLink,
          weight
        };
      })
    );

    return coffees;
  },
  // Meron
  252: async ({ webshop }) => {
    console.info('Fetching webshop page...');

    const response = await fetch(webshop);
    const html = await response.text();

    const {
      window: { document }
    } = new JSDOM(html);

    console.info('Parsing webshop page...');

    const productLinks = Array.from(
      document.querySelectorAll(
        '.product_cat-coffee:not(.product_cat-boxes-en,.product_cat-gifts-en) a.product-image-link'
      )
    )
      .filter(
        ({ href }) =>
          !href.includes('500g') && !href.includes('1kg') && !href.includes('1000g') && !href.includes('blend')
      )
      .map(({ href }) => href);

    const coffees = await Promise.all(
      productLinks.map(async (webshopItemLink) => {
        console.info(`Fetching item page: ${webshopItemLink}...`);
        const itemResponse = await fetch(webshopItemLink);
        const itemHtml = await itemResponse.text();

        console.info(`Parsing item page: ${webshopItemLink}...`);
        const {
          window: { document }
        } = new JSDOM(itemHtml);

        const price = parseFloat(
          document.querySelector('.price .woocommerce-Price-amount.amount').textContent.replaceAll(' €', '')
        );

        const currencySymbol = document.querySelector('.summary .price .woocommerce-Price-currencySymbol').textContent;
        const currency = currencyCodes[currencySymbol];

        if (!currency) {
          throw new Error(`Unknown currency: ${webshopItemLink}`);
        }

        const details = Array.from(document.querySelectorAll('.info-tab-tabel tr')).reduce((details, row) => {
          const cells = Array.from(row.querySelectorAll('td'));

          if (!cells?.length) {
            return details;
          }

          const key = cells[0].textContent.trim().toLowerCase().replace(':', '');
          const value = cells[1].textContent.trim().toLowerCase();

          return { ...details, [key]: value };
        }, {});

        if (!details.volume) {
          console.error(`No weight found at: ${webshopItemLink}`);

          return {};
        }

        const weight = Number(details.volume.replace(' gr', ''));

        const pricePerGram = Number((price / weight).toFixed(2));

        const originCountryId =
          originCountries.find(({ name }) => name === details['country of origin'] || webshopItemLink.includes(name))
            ?.origin_country_id || null;

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

        const isDecaf = webshopItemLink.includes('decaf');

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
          roastingLevelId,
          tasteNoteIds,
          webshopItemLink,
          weight
        };
      })
    );

    return coffees;
  }
};

export default parsers;
