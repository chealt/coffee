import { JSDOM } from 'jsdom';

const getDocument = (html) => {
  const {
    window: { document }
  } = new JSDOM(html);

  return document;
};

const parsers = {
  // Sheep & Raven
  6: ({ html }) => {
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
  7: async ({ html }) => {
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
  39: async ({ html }) => {
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
  },
  // Heresy
  65: async ({ html }) => {
    const document = getDocument(html);

    return Array.from(
      new Set(
        Array.from(document.querySelectorAll('.product_cat-coffee a.woocommerce-loop-product__link')).map(
          ({ href }) => href
        )
      )
    );
  },
  // Klaro
  70: async ({ html }) => {
    const document = getDocument(html);

    return Array.from(
      document.querySelectorAll('.instock.product_cat-coffee:not(.product_cat-dripbags) a.ast-loop-product__link')
    ).map(({ href }) => href);
  },
  // Spojka
  82: async ({ html, url }) => {
    const host = url.replace('/en', '');

    const document = getDocument(html);

    const navLinks = Array.from(
      new Set(
        Array.from(document.querySelectorAll('header nav a'))
          .filter(({ textContent }) => ['espresso', 'filter'].includes(textContent.trim().toLowerCase()))
          .map(({ href }) => `${host}${href}`)
      )
    );

    return await Promise.all(
      navLinks.map(async (navLink) => {
        const navLinkResponse = await fetch(navLink);
        const navLinkHtml = await navLinkResponse.text();

        const {
          window: { document: navLinkDocument }
        } = new JSDOM(navLinkHtml);

        return Array.from(navLinkDocument.querySelectorAll('h3 a[href^="/en/products/"]:not([id^="Standard"])'))
          .filter(({ textContent, href }) => !textContent.toLowerCase().includes('test') && !href.includes('kapsule'))
          .map(({ href }) => `${host}${href}`);
      })
    ).then((links) => links.flat());
  },
  // Meron
  252: async ({ html }) => {
    const document = getDocument(html);

    return Array.from(
      document.querySelectorAll(
        '.product_cat-coffee:not(.product_cat-boxes-en,.product_cat-gifts-en) a.product-image-link'
      )
    )
      .filter(
        ({ href }) =>
          !href.includes('500g') && !href.includes('1kg') && !href.includes('1000g') && !href.includes('blend')
      )
      .map(({ href }) => href);
  },
  // Father's (Czech)
  277: async ({ html }) => {
    const document = getDocument(html);

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

    return uniqueCoffeeElements.map(({ element }) => element.querySelector('a').href);
  }
};

export default parsers;
