# Webshop Item Processor Guide

This document explains how to add and modify parsers for the Central Beans webshop item processor.

**Purpose**: Extract detailed coffee metadata from a single product page.

### Required Fields

Your parser must extract and return an object with the following properties:

- `brewingMethodId` (Number or null): Look up using `brewingMethods` (e.g., espresso, filter, omni).
- `currency` (Number): Look up using `currencyCodes` from `currencies.js` (e.g., `currencyCodes['zł']`).
- `image` (String): An absolute URL to the primary product image.
- `originCountryId` (Number or null): Look up using `originCountries`.
- `price` (Number): The price of the coffee.
- `pricePerGram` (Number): Calculated as `Number((price / weight).toFixed(2))`.
- `roasterId` (Number): Passed in via arguments.
- `tasteNoteIds` (Array of Numbers): Mapped using `tasteNotes.json`.
- `varietyIds` (Array of Numbers): Mapped using `varieties.json`.
- `webshopItemLink` (String): Passed in via arguments as `url`.
- `weight` (Number): Weight in grams (e.g., 250).

### Optional Fields

- `isDecaf` (Boolean): True if it's decaf.
- `isOutOfStock` (Boolean): If true, simply return `{ isOutOfStock: true }` and skip other fields.
- `originRegionId` (Number or null): Look up using `originRegions`.
- `originFarmId` (Number or null): Look up using `originFarms`.
- `processingMethodId` (Number or null): Look up using `processingMethods`.
- `roastingLevelId` (Number or null): Look up using `roastingLevels`.

### Implementation Guide

1. **HTML/DOM Extraction**: Use `const document = getDocument(html);`.
2. **Text Normalization**: Always use English for variable names. Before mapping taste notes or varieties, extract the relevant text block and convert it to lowercase.
3. **Regex & Fallbacks**: If standard DOM selectors don't work (especially for dynamically loaded React/Vue sites), search the raw `html` string using regex for JSON payloads (e.g., Next.js `__NEXT_DATA__` or Shopify variants).
4. **Data Dictionaries**: Use the imported arrays (`tasteNotes`, `varieties`, `processingMethods`, etc.) from `../data/*.json` to look up the correct IDs.
5. **Visual Validation**: Always render the full product page visually (using a tool like Playwright to take a screenshot or view the rendered page) and thoroughly verify that the data returned by your parser perfectly matches the actual data visible to the user on the screenshot.

### How to use Playwright for Visual Validation

If you need to verify the page visually within the CLI environment, you can use Playwright to take a screenshot and then use the `Read` tool to view it:

```javascript
// test_screenshot.cjs
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('YOUR_URL_HERE', { waitUntil: 'networkidle' });

  // Accept cookies if necessary to see the full page
  // await page.click('button.accept-cookies');

  await page.screenshot({ path: 'screenshot.png', fullPage: true });
  await browser.close();
  console.log('Saved screenshot to screenshot.png');
})();
```

Run it via `node test_screenshot.cjs`, then use the `Read` tool on `/absolute/path/to/screenshot.png` to analyze the visual output. Ensure that all the taste notes, varieties, origin details, weight, and price listed on the image are accurately reflected in your parser's JSON output.

**Critical Requirement:** When parsing the HTML or visually validating via screenshot, ensure you are strictly extracting data belonging to the _primary product_ on the page. Many webshops display "You may also like" or "Related Products" sections. Be extremely careful not to accidentally parse titles, taste notes, or prices from these secondary/recommended products.

**Cleanup:** Make sure that you delete any temporary files and screenshots generated during your visual validation before creating any Git commits. Do not commit `.png`, `.jpg`, `.html` or `.cjs` scripts created for debugging.

### Example

```javascript
  // Example Roaster
  999: async ({ html, url, roasterId }) => {
    logger.info(`Parsing item page: ${url}`);
    const document = getDocument(html);

    // 1. Price & Weight
    const price = parseFloat(document.querySelector('.price')?.textContent.replace(/[^0-9.]/g, ''));
    if (!price) throw new Error(errors.priceMissing);

    const weight = 250; // Often hardcoded or extracted from DOM
    const pricePerGram = Number((price / weight).toFixed(2));
    const currency = currencyCodes['zł'];

    // 2. Image
    // Use fallback strategies if og:image is missing
    let image = document.querySelector('meta[property="og:image"]')?.content
      || document.querySelector('.product-image img')?.src;

    if (!image) throw new Error(errors.imageMissing);

    // 3. Mapping data (Taste notes, Varieties, Origin)
    const description = document.body.textContent.toLowerCase();

    const originCountryId = originCountries.find(({ name }) => description.includes(name))?.origin_country_id || null;
    if (!originCountryId) throw new Error(errors.originCountryMissing);

    const tasteNoteIds = tasteNotes
      .filter(({ name, alias }) => description.includes(name) || (alias && description.includes(alias)))
      .map(({ taste_note_id: id }) => id);

    const varietyIds = varieties
      .filter(({ name, alias }) => description.includes(name.toLowerCase()) || (alias && description.includes(alias.toLowerCase())))
      .map(({ id }) => id);

    const brewingMethodId = brewingMethods.find(({ name }) => name === 'omni')?.brewing_method_id;

    // 4. Return Object
    return {
      brewingMethodId,
      currency,
      image,
      originCountryId,
      price,
      pricePerGram,
      roasterId,
      tasteNoteIds,
      varietyIds,
      webshopItemLink: url,
      weight
    };
  }
```
