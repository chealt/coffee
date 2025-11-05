import { JSDOM } from 'jsdom';

const getDocument = (html) => {
  const {
    window: { document }
  } = new JSDOM(html);

  return document;
};

const parsers = {
  // Sheep & Raven
  6: ({ html, url }) => {
    console.info(`Parsing webshop page ${url}`);

    const document = getDocument(html);

    const hiddenProductSelectors = [
      '.product_cat-akcesoria',
      '.product_cat-accessories',
      '.product_cat-warsztaty-kawowe',
      '.product_cat-workshops'
    ];
    const productLinks = document.querySelectorAll(
      `.product:not(${hiddenProductSelectors.join(',')}) .--eael-wrapper-link-tag`
    );

    return Array.from(new Set(Array.from(productLinks).map((productLink) => productLink.href)));
  },
  // El Cafetero
  7: async ({ html, url }) => {
    console.info(`Parsing webshop page ${url}`);

    const document = getDocument(html);

    return Array.from(
      new Set(
        Array.from(document.querySelectorAll(`.product-miniature:not(:has(.out_of_stock)) a.product-thumbnail`)).map(
          ({ href }) => href
        )
      )
    );
  },
  // BeMyBean
  39: async ({ html, url }) => {
    console.info(`Parsing webshop page ${url}`);

    const document = getDocument(html);

    // espresso links
    const espressoLink = document.querySelector('[data-id="5e99470"] a');

    const espressoResponse = await fetch(espressoLink.href);
    const espressoHtml = await espressoResponse.text();

    const espressoDocument = getDocument(espressoHtml);

    const espressoLinks = espressoDocument.querySelectorAll('.product_cat-espresso a');

    // alternative links
    const alternativeLink = document.querySelector('[data-id="cbb6602"] a');

    const alternativeResponse = await fetch(alternativeLink.href);
    const alternativeHtml = await alternativeResponse.text();

    const alternativeDocument = getDocument(alternativeHtml);

    const alternativeLinks = alternativeDocument.querySelectorAll('.product_cat-alternatywa a');

    const productLinks = [...espressoLinks, ...alternativeLinks];

    return Array.from(new Set(Array.from(productLinks).map((productLink) => productLink.href)));
  }
};

export default parsers;
