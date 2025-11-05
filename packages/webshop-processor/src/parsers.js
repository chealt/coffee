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

    const website = new URL(url).origin;

    return Array.from(
      new Set(
        Array.from(document.querySelectorAll(`product-link a`)).map(
          ({ href }) => (href.startsWith('/') ? `${website}${href}` : href) // handle relative URLs
        )
      )
    );
  }
};

export default parsers;
