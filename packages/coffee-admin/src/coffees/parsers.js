/* eslint-disable no-console, no-shadow */
import { JSDOM } from 'jsdom';

import brewingMethods from '../../../coffee.chealt.com/data/brewingMethods.json' with { type: 'json' };
import originCountries from '../../../coffee.chealt.com/data/originCountries.json' with { type: 'json' };
import originFarms from '../../../coffee.chealt.com/data/originFarms.json' with { type: 'json' };
import originRegions from '../../../coffee.chealt.com/data/originRegions.json' with { type: 'json' };

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

    return coffees.filter(({ originCountryId }) => Boolean(originCountryId)); // origin country ID must be set
  }
};

export default parsers;
