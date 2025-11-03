import { JSDOM } from 'jsdom';

const parsers = {
  6: (html) => {
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

    return Array.from(new Set(Array.from(productLinks).map((productLink) => productLink.href)));
  }
};

export default parsers;
