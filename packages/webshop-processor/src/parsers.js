import { JSDOM } from 'jsdom';

const getDocument = (html) => {
  const {
    window: { document }
  } = new JSDOM(html);

  return document;
};

// Parsers ordered by roaster ID
const parsers = {
  // Prolog
  1: async ({ url }) => {
    const { origin, pathname } = new URL(url);

    const response = await fetch(`${origin}${pathname}/products.json?limit=250`);
    const { products } = await response.json();

    return products.map(({ handle }) => `${origin}/products/${handle}`);
  },
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
        Array.from(document.querySelectorAll(`.product-miniature:not(:has(.out_of_stock)) a.product-thumbnail`))
          .map(({ href }) => href)
          .filter((url) => !url.includes('drippera'))
      )
    );
  },
  // La Cabra
  10: async ({ html, url }) => {
    const document = getDocument(html);

    const { origin } = new URL(url);

    return Array.from(
      new Set(
        Array.from(document.querySelectorAll('.coffee-product a'))
          .filter(({ href }) => !href.includes('subscription'))
          .map(({ href }) => `${origin}${href.trim()}`)
      )
    );
  },
  // Coffee Collective
  11: async ({ html, url }) => {
    const document = getDocument(html);
    const { origin } = new URL(url);

    // espresso links
    const espressoLink = document.querySelector('a#HeaderDrawer-shop-espresso');

    const espressoResponse = await fetch(`${origin}${espressoLink.href}`);
    const espressoHtml = await espressoResponse.text();

    const espressoDocument = getDocument(espressoHtml);

    const espressoLinks = espressoDocument.querySelectorAll('#product-grid a.full-unstyled-link');

    // alternative links
    const alternativeLink = document.querySelector('a#HeaderDrawer-shop-filter-coffee');

    const alternativeResponse = await fetch(`${origin}${alternativeLink.href}`);
    const alternativeHtml = await alternativeResponse.text();

    const alternativeDocument = getDocument(alternativeHtml);

    const alternativeLinks = alternativeDocument.querySelectorAll('#product-grid a.full-unstyled-link');

    const productLinks = [...espressoLinks, ...alternativeLinks];

    return Array.from(new Set(Array.from(productLinks).map((productLink) => productLink.href)))
      .map((href) => `${origin}${href}`)
      .filter((itemUrl) => !itemUrl.includes('pack') && !itemUrl.includes('blend'));
  },
  // Friedhats
  12: ({ html }) => {
    const document = getDocument(html);

    const ldJsonScript = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).find((script) =>
      script.textContent.includes('"CollectionPage"')
    );

    if (!ldJsonScript) {
      return [];
    }

    const data = JSON.parse(ldJsonScript.textContent);

    return Array.from(
      new Set(
        (data.mainEntity?.itemListElement || [])
          .map(({ item }) => item?.url)
          .filter((href) => href && !href.includes('blend'))
      )
    );
  },
  // Typika
  14: async ({ html, url }) => {
    const document = getDocument(html);

    const { origin } = new URL(url);

    return Array.from(
      new Set(
        Array.from(document.querySelectorAll(`.product-item__image-link`))
          .filter(({ href }) => !href.includes('-set-'))
          .map(({ href }) => `${origin}${href}`)
      )
    );
  },
  // BeMyBean
  39: async ({ html, url }) => {
    const document = getDocument(html);
    const { origin } = new URL(url);

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

    return Array.from(new Set(Array.from(productLinks).map((productLink) => productLink.href))).filter(
      (href) => href.includes(origin) && !href.includes('blend') && !href.includes('zestaw-prezentowy') // remove blends and gift sets
    );
  },
  // april
  47: async ({ html, url }) => {
    const document = getDocument(html);
    const { origin } = new URL(url);

    // espresso links
    const espressoLink = document.querySelector('.navmenu-id-espresso-beans a');

    const espressoResponse = await fetch(espressoLink.href);
    const espressoHtml = await espressoResponse.text();

    const espressoDocument = getDocument(espressoHtml);

    const espressoLinks = espressoDocument.querySelectorAll('a.productitem--image-link');

    // alternative links
    const alternativeLink = document.querySelector('.navmenu-id-filter-beans a');

    const alternativeResponse = await fetch(alternativeLink.href);
    const alternativeHtml = await alternativeResponse.text();

    const alternativeDocument = getDocument(alternativeHtml);

    const alternativeLinks = alternativeDocument.querySelectorAll('a.productitem--image-link');

    const productLinks = [...espressoLinks, ...alternativeLinks];

    return Array.from(new Set(Array.from(productLinks).map((productLink) => productLink.href)))
      .filter((href) => !href.includes('box') && !href.includes('giftcard') && !href.includes('subscription'))
      .map((href) => `${origin}${href}`);
  },
  // Heresy
  65: async ({ html }) => {
    const document = getDocument(html);

    return Array.from(
      new Set(
        Array.from(document.querySelectorAll('.product_cat-coffee a.woocommerce-loop-product__link'))
          .map(({ href }) => href)
          .filter((url) => !url.includes('blend'))
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
    )
      .then((links) => links.flat())
      .then((links) => Array.from(new Set(links)));
  },
  // A.M.O.C.
  94: ({ html }) => {
    const document = getDocument(html);

    return Array.from(
      new Set(
        Array.from(document.querySelectorAll('a.woocommerce-loop-product__link'))
          .filter(({ href }) => !href.includes('drip-bags') && !href.includes('/archive/'))
          .map(({ href }) => href)
      )
    );
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
  // Nolens Volens
  258: ({ html }) => {
    const document = getDocument(html);

    const productSelectors = [
      '.instock.product_cat-espresso a.ast-loop-product__link',
      '.instock.product_cat-filtr a.ast-loop-product__link',
      '.instock.product_cat-omniroast a.ast-loop-product__link'
    ];

    return Array.from(
      new Set(Array.from(document.querySelectorAll(productSelectors.join(','))).map(({ href }) => href))
    );
  },
  // Pikola
  265: ({ html, url }) => {
    const document = getDocument(html);
    const { origin } = new URL(url);

    return Array.from(
      new Set(
        Array.from(document.querySelectorAll('article.card-item[data-href]'))
          .map((article) => article.getAttribute('data-href'))
          .filter((href) => /-(espresso|filtr|omni)$/u.test(href))
          .map((href) => (href.startsWith('http') ? href : `${origin}${href}`))
      )
    );
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

    return uniqueCoffeeElements
      .map(({ element }) => element.querySelector('a').href)
      .filter((href) => !href.includes('-set'));
  },
  // PALE
  278: async ({ html }) => {
    const document = getDocument(html);

    return Array.from(document.querySelectorAll('.wc-block-components-product-image a')).map((element) => element.href);
  },
  // Bani Beans
  285: async ({ html, url }) => {
    const document = getDocument(html);
    const { origin } = new URL(url);

    return Array.from(document.querySelectorAll('.product-card-wrapper .full-unstyled-link[id^="CardLink"]'))
      .filter(({ href }) => !href.includes('paper-filters'))
      .map(({ href }) => `${origin}${href}`);
  },
  // Stow
  286: async ({ html }) => {
    const document = getDocument(html);

    return Array.from(document.querySelectorAll('section:not([id="cascara"]) .produkt a'))
      .filter(({ href }) => !href.includes('cold-brew') && !href.includes('blend'))
      .map(({ href }) => href);
  },
  // kava family
  287: async ({ html, url }) => {
    const document = getDocument(html);

    return Array.from(document.querySelectorAll('.product-item a'))
      .map(({ href }) => `${new URL(url).origin}${href}`)
      .filter((href) => !href.includes('blend'));
  },
  // nordbeans
  288: async ({ html, url }) => {
    const { origin } = new URL(url);
    const document = getDocument(html);

    const typePageUrls = Array.from(
      document.querySelectorAll(
        '.subsection-item-inner[title^="Espresso"],.subsection-item-inner[title^="Filter"],.subsection-item-inner[title^="Decaf"]'
      )
    ).map(({ href }) => `${origin}${href}`);

    const productLinks = [];

    for (const page of typePageUrls) {
      const response = await fetch(page);
      const pageHTML = await response.text();

      const pageDocument = getDocument(pageHTML);

      productLinks.push(
        ...Array.from(pageDocument.querySelectorAll('a.product-link'))
          .filter(({ href }) => !href.includes('blend') && !href.includes('pack') && !href.includes('-tea'))
          .map(({ href }) => `${origin}${href}`)
      );
    }

    return productLinks;
  },
  // Roast Grind Brew
  290: async ({ html, url }) => {
    const document = getDocument(html);

    const { origin } = new URL(url);

    return Array.from(document.querySelectorAll('a.contents:has(img)')).map(({ href }) => `${origin}${href.trim()}`);
  },
  // Teso
  291: async ({ html }) => {
    const document = getDocument(html);

    return Array.from(document.querySelectorAll('.product-tile a'))
      .filter(({ href }) => !href.includes('probki'))
      .map(({ href }) => href);
  },
  // Craft Beans
  297: async ({ html }) => {
    const document = getDocument(html);

    const allLinks = Array.from(document.querySelectorAll('a')).map((a) => a.href);
    const coffeeLinks = Array.from(
      new Set(allLinks.filter((l) => l.includes('sklep/kawy/') && l.split('/').length > 6))
    );

    return coffeeLinks.filter((l) => !l.includes('/zestawy') && !l.includes('zestaw-') && !l.includes('mieszanki'));
  },
  // Datura
  304: ({ html, url }) => {
    const document = getDocument(html);
    const { origin } = new URL(url);

    return Array.from(
      new Set(
        Array.from(document.querySelectorAll('.product-card-wrapper .full-unstyled-link[id^="CardLink"]'))
          .filter(({ href }) => !href.includes('2x25g') && !href.includes('blend'))
          .map(({ href }) => `${origin}${href}`)
      )
    );
  },
  // Manhattan
  305: async ({ html }) => {
    const document = getDocument(html);

    return Array.from(
      new Set(
        Array.from(document.querySelectorAll('.woocommerce-LoopProduct-link'))
          .map(({ href }) => href)
          .filter((href) => !href.includes('gift') && !href.includes('subscription'))
      )
    );
  },
  // naughty dog
  310: ({ html }) => {
    const document = getDocument(html);

    return Array.from(
      new Set(
        Array.from(document.querySelectorAll('div[class*="category_item_"] a[href*="-the-naughty-dog/"]'))
          .map(({ href }) => href)
          .filter((href) => !href.includes('/reviews') && !href.includes('-blend') && !/-1000-?g/.test(href))
      )
    );
  },
  // Doubleshot
  311: ({ html, url }) => {
    const document = getDocument(html);
    const { origin } = new URL(url);

    return Array.from(
      new Set(
        Array.from(document.querySelectorAll('.productBox a.productBox-link'))
          .map(({ href }) => href)
          .filter((href) => href.includes('/products/'))
          .filter((href) => !href.includes('capsules') && !href.includes('steeped'))
          .map((href) => (href.startsWith('http') ? href : `${origin}${href}`))
      )
    );
  },
  // Serce Kawy
  314: ({ html, url }) => {
    const document = getDocument(html);
    const { origin } = new URL(url);

    return Array.from(
      new Set(
        Array.from(document.querySelectorAll('a[href*="/pl/p/"]'))
          .map(({ href }) => href)
          .map((href) => (href.startsWith('http') ? href : `${origin}${href}`))
      )
    );
  },
  // BeBerry
  315: async ({ html, url }) => {
    const coffeeCategorySelector = [
      '.product.instock.product_cat-filtr',
      '.product.instock.product_cat-espresso',
      '.product.instock.product_cat-filtr-omni-roast'
    ].join(',');

    const collectLinks = (doc) =>
      Array.from(doc.querySelectorAll(coffeeCategorySelector)).map(
        (product) => product.querySelector('a.woocommerce-loop-product__link').href
      );

    const document = getDocument(html);
    const links = collectLinks(document);

    const pageLinks = Array.from(
      new Set(
        Array.from(document.querySelectorAll('.woocommerce-pagination a.page-numbers'))
          .map(({ href }) => href)
          .filter((href) => href && /\/page\/\d+\/?$/u.test(href))
      )
    );

    for (const pageUrl of pageLinks) {
      const pageResponse = await fetch(pageUrl);
      const pageHtml = await pageResponse.text();
      const pageDocument = getDocument(pageHtml);

      links.push(...collectLinks(pageDocument));
    }

    const { origin } = new URL(url);

    return Array.from(new Set(links)).map((href) => (href.startsWith('http') ? href : `${origin}${href}`));
  },
  // Leń
  317: async ({ url }) => {
    const { origin, pathname } = new URL(url);

    const response = await fetch(`${origin}${pathname}/products.json?limit=250`);
    const { products } = await response.json();

    return products.map(({ handle }) => `${origin}/products/${handle}`);
  }
};

export default parsers;
