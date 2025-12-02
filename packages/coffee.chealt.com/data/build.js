import { createClient } from '@libsql/client';

import { readFile, writeFile } from 'node:fs/promises';

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

const saveBrewingMethods = async () => {
  const results = await turso.execute('SELECT * FROM brewing_methods_all ORDER BY name ASC');

  return writeFile('./data/brewingMethods.json', JSON.stringify(results.rows), { flag: 'w+' });
};

const saveBrewingMethodGroups = async () => {
  const results = await turso.execute('SELECT * FROM brewing_method_groups ORDER BY name ASC');

  return writeFile('./data/brewingMethodGroups.json', JSON.stringify(results.rows), { flag: 'w+' });
};

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

const saveCountries = async () => {
  const results = await turso.execute('SELECT * FROM countries_all ORDER BY name COLLATE nocase ASC');

  return writeFile('./data/countries.json', JSON.stringify(results.rows), { flag: 'w+' });
};

const saveCountriesWithCoffees = async () => {
  const results = await turso.execute(
    'SELECT ca.* FROM countries_all ca JOIN roasters r ON r.country_id = ca.country_id JOIN coffees c ON c.roaster_id = r.id WHERE NOT c.is_removed GROUP BY 1, 2, 3 ORDER BY name COLLATE nocase ASC'
  );

  return writeFile('./data/countriesWithCoffees.json', JSON.stringify(results.rows), { flag: 'w+' });
};

const coffees = JSON.parse(await readFile('./data/coffees.json'));
const currentCoffeeIds = coffees.map(({ id }) => id);
const currentNewCoffeeIds = JSON.parse(await readFile('./data/newCoffeeIds.json'));
const saveNewCoffees = async (newCoffees) => {
  const newCoffeeIds = newCoffees.map(({ id }) => id).filter((id) => !currentCoffeeIds.includes(id));
  const removedNewCoffeeIds = currentNewCoffeeIds.filter(
    (id) => coffees.find(({ id: coffeeId }) => coffeeId === id)?.is_removed
  );

  if (removedNewCoffeeIds.length) {
    console.info(`Removing ${removedNewCoffeeIds.length} coffees from new coffee list.`);

    await writeFile(
      './data/newCoffeeIds.json',
      JSON.stringify(newCoffeeIds.filter((id) => !removedNewCoffeeIds.includes(id))),
      { flag: 'w+' }
    );
  }

  if (!newCoffeeIds.length) {
    console.info(`No new coffees found.`);

    return undefined;
  }

  return writeFile(
    './data/newCoffeeIds.json',
    JSON.stringify(newCoffeeIds.filter((id) => coffees.find(({ id: coffeeId }) => coffeeId === id)?.is_removed)),
    { flag: 'w+' }
  );
};

const saveCoffees = async () => {
  const results = await turso.execute('SELECT * FROM coffees_all WHERE NOT is_removed');

  await writeFile('./data/coffees.json', JSON.stringify(results.rows), { flag: 'w+' });

  return saveNewCoffees(results.rows);
};

const saveCoffeeImages = async () => {
  const results = await turso.execute(
    'SELECT ci.* FROM coffee_images ci JOIN coffees c ON c.id = ci.coffee_id WHERE NOT c.is_removed'
  );

  return writeFile('./data/coffeeImages.json', JSON.stringify(results.rows), { flag: 'w+' });
};

const saveCoffeeTasteNotes = async () => {
  const results = await turso.execute(
    'SELECT ctn.* FROM coffee_taste_notes ctn JOIN coffees c ON c.id = ctn.coffee_id WHERE NOT c.is_removed'
  );

  return writeFile('./data/coffeeTasteNotes.json', JSON.stringify(results.rows), { flag: 'w+' });
};

const saveCoffeeVarieties = async () => {
  const results = await turso.execute(
    'SELECT cv.* FROM coffee_varieties cv JOIN coffees c ON c.id = cv.coffee_id WHERE NOT c.is_removed'
  );

  return writeFile('./data/coffeeVarieties.json', JSON.stringify(results.rows), { flag: 'w+' });
};

const saveExchangeRates = async () => {
  const results = await turso.execute('SELECT * FROM exchange_rates');

  return writeFile('./data/exchangeRates.json', JSON.stringify(results.rows), { flag: 'w+' });
};

const saveFarms = async () => {
  const results = await turso.execute('SELECT * FROM origin_farms');

  return writeFile('./data/originFarms.json', JSON.stringify(results.rows), { flag: 'w+' });
};

const saveMiscellaneousCoffeeProperties = async () => {
  const results = await turso.execute('SELECT * FROM miscellaneous_coffee_properties_all ORDER BY name ASC');

  return writeFile('./data/miscellaneousCoffeeProperties.json', JSON.stringify(results.rows), { flag: 'w+' });
};

const saveOriginCountriesWithCoffees = async () => {
  const results = await turso.execute('SELECT * FROM origin_countries_all_with_coffees ORDER BY name ASC');

  return writeFile('./data/originCountriesWithCoffees.json', JSON.stringify(results.rows), { flag: 'w+' });
};

const saveTasteNotes = async () => {
  const results = await turso.execute('SELECT * FROM taste_notes_all ORDER BY name ASC');

  return writeFile('./data/tasteNotes.json', JSON.stringify(results.rows), { flag: 'w+' });
};

const saveTasteNoteGroups = async () => {
  const results = await turso.execute('SELECT * FROM taste_note_groups_all ORDER BY name ASC');

  return writeFile('./data/tasteNoteGroups.json', JSON.stringify(results.rows), { flag: 'w+' });
};

const saveTasteNoteSubGroups = async () => {
  const results = await turso.execute('SELECT * FROM taste_note_sub_groups_all ORDER BY name ASC');

  return writeFile('./data/tasteNoteSubGroups.json', JSON.stringify(results.rows), { flag: 'w+' });
};

const saveVarieties = async () => {
  const results = await turso.execute('SELECT * FROM varieties ORDER BY name ASC');

  return writeFile('./data/varieties.json', JSON.stringify(results.rows), { flag: 'w+' });
};

await Promise.all([
  saveBrewingMethods(),
  saveBrewingMethodGroups(),
  saveCoffees(),
  saveCoffeeImages(),
  saveCoffeeTasteNotes(),
  saveCoffeeVarieties(),
  saveCountries(),
  saveCountriesWithCoffees(),
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
  saveTasteNotes(),
  saveTasteNoteGroups(),
  saveTasteNoteSubGroups(),
  saveVarieties()
]);
