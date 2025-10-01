import { createClient } from '@libsql/client';

import { writeFile } from 'node:fs/promises';

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

const saveRoasters = async () => {
  const results = await turso.execute('SELECT * FROM roasters ORDER BY name COLLATE nocase ASC');

  return writeFile('./data/roasters.json', JSON.stringify(results.rows), { flag: 'w+' });
};

const saveRoastersWithCoffees = async () => {
  const results = await turso.execute('SELECT * FROM roasters_with_coffees ORDER BY name COLLATE nocase ASC');

  return writeFile('./data/roastersWithCoffees.json', JSON.stringify(results.rows), { flag: 'w+' });
};

const saveRoastersBest = async () => {
  const results = await turso.execute('SELECT * FROM roasters WHERE is_best = TRUE ORDER BY name COLLATE nocase ASC');

  return writeFile('./data/roastersBest.json', JSON.stringify(results.rows), { flag: 'w+' });
};

const saveRoastingLevels = async () => {
  const results = await turso.execute('SELECT * FROM roasting_levels_all ORDER BY name ASC');

  return writeFile('./data/roastingLevels.json', JSON.stringify(results.rows), { flag: 'w+' });
};

const saveOriginCountries = async () => {
  const results = await turso.execute('SELECT * FROM origin_countries_all ORDER BY name ASC');

  return writeFile('./data/originCountries.json', JSON.stringify(results.rows), { flag: 'w+' });
};

const saveOriginRegions = async () => {
  const results = await turso.execute('SELECT * FROM origin_regions_all ORDER BY name ASC');

  return writeFile('./data/originRegions.json', JSON.stringify(results.rows), { flag: 'w+' });
};

const saveProcessingMethods = async () => {
  const results = await turso.execute('SELECT * FROM processing_methods_all ORDER BY name ASC');

  return writeFile('./data/processingMethods.json', JSON.stringify(results.rows), { flag: 'w+' });
};

const saveMiscellaneousCoffeeProperties = async () => {
  const results = await turso.execute('SELECT * FROM miscellaneous_coffee_properties_all ORDER BY name ASC');

  return writeFile('./data/miscellaneousCoffeeProperties.json', JSON.stringify(results.rows), { flag: 'w+' });
};

const saveBrewingMethods = async () => {
  const results = await turso.execute('SELECT * FROM brewing_methods_all ORDER BY name ASC');

  return writeFile('./data/brewingMethods.json', JSON.stringify(results.rows), { flag: 'w+' });
};

const saveCountries = async () => {
  const results = await turso.execute('SELECT * FROM countries_all ORDER BY name COLLATE nocase ASC');

  return writeFile('./data/countries.json', JSON.stringify(results.rows), { flag: 'w+' });
};

const saveCoffees = async () => {
  const results = await turso.execute('SELECT * FROM coffees_all WHERE NOT is_removed');

  return writeFile('./data/coffees.json', JSON.stringify(results.rows), { flag: 'w+' });
};

const saveCoffeeImages = async () => {
  const results = await turso.execute('SELECT * FROM coffee_images');

  return writeFile('./data/coffeeImages.json', JSON.stringify(results.rows), { flag: 'w+' });
};

const saveExchangeRates = async () => {
  const results = await turso.execute('SELECT * FROM exchange_rates');

  return writeFile('./data/exchangeRates.json', JSON.stringify(results.rows), { flag: 'w+' });
};

const saveFarms = async () => {
  const results = await turso.execute('SELECT * FROM origin_farms');

  return writeFile('./data/originFarms.json', JSON.stringify(results.rows), { flag: 'w+' });
};

const saveOriginCountriesWithCoffees = async () => {
  const results = await turso.execute('SELECT * FROM origin_countries_all_with_coffees ORDER BY name ASC');

  return writeFile('./data/originCountriesWithCoffees.json', JSON.stringify(results.rows), { flag: 'w+' });
};

const saveTasteNotes = async () => {
  const results = await turso.execute('SELECT * FROM taste_notes_all ORDER BY name ASC');

  return writeFile('./data/tasteNotes.json', JSON.stringify(results.rows), { flag: 'w+' });
};

await Promise.all([
  saveBrewingMethods(),
  saveCoffees(),
  saveCoffeeImages(),
  saveCountries(),
  saveExchangeRates(),
  saveFarms(),
  saveMiscellaneousCoffeeProperties(),
  saveOriginCountries(),
  saveOriginCountriesWithCoffees(),
  saveOriginRegions(),
  saveProcessingMethods(),
  saveRoasters(),
  saveRoastersBest(),
  saveRoastersWithCoffees(),
  saveRoastingLevels(),
  saveTasteNotes()
]);
