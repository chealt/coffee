/* eslint-disable no-console, no-shadow, complexity */
import { JSDOM } from 'jsdom';

import currencyCodes from './currencies.js';
import brewingMethods from '../../../coffee.chealt.com/data/brewingMethods.json' with { type: 'json' };
import originCountries from '../../../coffee.chealt.com/data/originCountries.json' with { type: 'json' };
import originFarms from '../../../coffee.chealt.com/data/originFarms.json' with { type: 'json' };
import originRegions from '../../../coffee.chealt.com/data/originRegions.json' with { type: 'json' };
import processingMethods from '../../../coffee.chealt.com/data/processingMethods.json' with { type: 'json' };

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

    const hiddenProductSelectors = ['.product_cat-akcesoria', '.product_cat-warsztaty-kawowe'];
    const productLinks = document.querySelectorAll(
      `.product:not(${hiddenProductSelectors.join(',')}) .--eael-wrapper-link-tag`
    );

    const uniqueProductLinks = new Set(Array.from(productLinks).map((productLink) => productLink.href));

    const coffees = await Promise.all(
      Array.from(uniqueProductLinks).map(async (webshopItemLink) => {
        console.info('Fetching webshop item page...');

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

        const weight = Number(document.querySelector('.swatch_label').dataset.value.replaceAll('g', ''));

        const pricePerGram = Number((price / weight).toFixed(2));

        const originCountry = document.querySelector('[data-id="0e5f7ea"]').textContent.trim().toLowerCase();
        const originCountryId = originCountries.find(({ name }) => name === originCountry)?.origin_country_id || null;

        const brewingMethod = document.querySelector('[data-id="9f15ce8"]').textContent.trim().toLowerCase();
        const brewingMethodId =
          brewingMethods.find(
            ({ name }) => name === brewingMethod || (brewingMethod === 'espresso / pour over' && name === 'omni')
          )?.brewing_method_id || null;

        const regionOrFarm = document.querySelector('[data-id="52c6f27"]').textContent.trim().toLowerCase();

        const originRegionId = originRegions.find(({ name }) => regionOrFarm.includes(name))?.origin_region_id || null;
        const originFarmId = originFarms.find(({ name }) => regionOrFarm.includes(name))?.id || null;

        const image = document.querySelector('.woocommerce-product-gallery__wrapper img').src;

        return {
          originCountryId,
          originRegionId,
          originFarmId,
          brewingMethodId,
          price,
          pricePerGram,
          weight,
          webshopItemLink,
          image
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
        console.log(`Fetching item page: ${webshopItemLink}...`);
        const itemResponse = await fetch(webshopItemLink);
        const itemHtml = await itemResponse.text();

        const {
          window: { document: itemDocument }
        } = new JSDOM(itemHtml);

        const price = parseFloat(itemDocument.querySelector('.price .woocommerce-Price-amount').textContent);

        const weight = Number(
          itemDocument.querySelector('#masa-netto option:not([value=""])').value.replaceAll('g', '')
        );

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

        const brewingMethod = 'espresso';
        const brewingMethodId = brewingMethods.find(({ name }) => name === brewingMethod)?.brewing_method_id || null;

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

        const isDecaf = processingMethod.includes('decaf');

        const image = itemDocument.querySelector('.woocommerce-product-gallery__wrapper img').src;

        return {
          originCountryId,
          originRegionId,
          originFarmId: null,
          brewingMethodId,
          price,
          pricePerGram,
          processingMethodId,
          weight,
          webshopItemLink,
          isDecaf,
          image
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
        console.info(`Fetching item page: ${webshopItemLink}...`);
        const itemResponse = await fetch(webshopItemLink);
        const itemHtml = await itemResponse.text();

        const {
          window: { document }
        } = new JSDOM(itemHtml);

        const price = parseFloat(
          document.querySelector('.price .woocommerce-Price-amount').textContent.replaceAll('€ ', '')
        );

        const currencySymbol = document.querySelector('.woocommerce-Price-currencySymbol').textContent;
        const currency = currencyCodes[currencySymbol];

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
          document.querySelectorAll('.woocommerce-product-details__short-description span')
        ).map((element) => element.textContent.trim().toLowerCase());

        if (detailValues.length === 0) {
          detailValues = Array.from(
            document.querySelectorAll('.woocommerce-product-details__short-description strong')
          ).map((element) => element.nextSibling?.textContent.trim().toLowerCase());
        }

        const details = detailNames.reduce((details, name, index) => ({ ...details, [name]: detailValues[index] }), {});

        if (Object.keys(details).length === 0 || !details.country) {
          console.error(`No details found at: ${webshopItemLink}`);

          return {};
        }

        const originCountry = details.country;
        const originCountryId = originCountries.find(({ name }) => name === originCountry)?.origin_country_id || null;

        const processingMethod = details.processing;
        const processingMethodId =
          processingMethods.find(({ name }) => name === processingMethod)?.processing_method_id || null;

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

        const image = document.querySelector('.nasa-item-main-image-wrap .wp-post-image').src;

        return {
          brewingMethodId,
          currency,
          originCountryId,
          originFarmId,
          originRegionId,
          price,
          pricePerGram,
          processingMethodId,
          webshopItemLink,
          weight,
          image,
          isDecaf: processingMethod?.includes('decaf')
        };
      })
    );

    return coffees;
  }
};

export default parsers;
