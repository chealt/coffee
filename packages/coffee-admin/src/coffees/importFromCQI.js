/* eslint-disable no-console */
import { createClient } from '@libsql/client';
import { test } from '@playwright/test';

const username = process.env.CQI_USERNAME;
const password = process.env.CQI_PASSWORD;

if (!username || !password) {
  throw new Error('CQI_USERNAME and CQI_PASSWORD must be set');
}

const englishLanguageID = 2;
const originAliases = {
  'tanzania, united republic of': 'tanzania'
};
const emptyValueStrings = ['n/a', 'n / a', 'various', 'varios'];
const parseAltitude = (altitude) => {
  const cleanAltitude = altitude?.includes('-')
    ? (Number(altitude.replaceAll(',', '').split('-')[1]) - Number(altitude.replaceAll(',', '').split('-')[0])) / 2 +
      Number(altitude.replaceAll(',', '').split('-')[0])
    : Number(altitude?.replaceAll(',', ''));

  return !Number.isNaN(cleanAltitude) ? cleanAltitude : null;
};

test('parse coffees', async ({ page }) => {
  await page.goto('https://database.coffeeinstitute.org/login');

  await page.getByPlaceholder(/Email or Username/u).fill(username);
  await page.getByPlaceholder(/Password/u).fill(password);

  await page.locator('[type=submit]').click();

  await page.getByText(/successful login/u);

  await page.getByRole('heading', { name: /Welcome to CQI Central/u, level: 4 });

  const origins = [];

  for (let pageNumber = 1; pageNumber <= 10; pageNumber++) {
    console.info(`Fetching page number: ${pageNumber}...`);

    const responseJSON = await page.evaluate(
      async ({ draw, startOffset }) => {
        const requestBody = `
          draw=${draw}
          &columns%5B0%5D%5Bdata%5D=pass_cert
            &columns%5B0%5D%5Bname%5D=
            &columns%5B0%5D%5Bsearchable%5D=true
            &columns%5B0%5D%5Borderable%5D=true
            &columns%5B0%5D%5Bsearch%5D%5Bvalue%5D=
            &columns%5B0%5D%5Bsearch%5D%5Bregex%5D=false
          &columns%5B1%5D%5Bdata%5D=random_id
            &columns%5B1%5D%5Bname%5D=
            &columns%5B1%5D%5Bsearchable%5D=true
            &columns%5B1%5D%5Borderable%5D=true
            &columns%5B1%5D%5Bsearch%5D%5Bvalue%5D=
            &columns%5B1%5D%5Bsearch%5D%5Bregex%5D=false
          &columns%5B2%5D%5Bdata%5D=species_title
            &columns%5B2%5D%5Bname%5D=
            &columns%5B2%5D%5Bsearchable%5D=true
            &columns%5B2%5D%5Borderable%5D=true
            &columns%5B2%5D%5Bsearch%5D%5Bvalue%5D=
            &columns%5B2%5D%5Bsearch%5D%5Bregex%5D=false
          &columns%5B3%5D%5Bdata%5D=origin_title
            &columns%5B3%5D%5Bname%5D=
            &columns%5B3%5D%5Bsearchable%5D=true
            &columns%5B3%5D%5Borderable%5D=true
            &columns%5B3%5D%5Bsearch%5D%5Bvalue%5D=
            &columns%5B3%5D%5Bsearch%5D%5Bregex%5D=false
          &columns%5B4%5D%5Bdata%5D=createdBy_name
            &columns%5B4%5D%5Bname%5D=
            &columns%5B4%5D%5Bsearchable%5D=true
            &columns%5B4%5D%5Borderable%5D=true
            &columns%5B4%5D%5Bsearch%5D%5Bvalue%5D=
            &columns%5B4%5D%5Bsearch%5D%5Bregex%5D=false
          &columns%5B5%5D%5Bdata%5D=grade_f
            &columns%5B5%5D%5Bname%5D=
            &columns%5B5%5D%5Bsearchable%5D=true
            &columns%5B5%5D%5Borderable%5D=true
            &columns%5B5%5D%5Bsearch%5D%5Bvalue%5D=
            &columns%5B5%5D%5Bsearch%5D%5Bregex%5D=false
          &columns%5B6%5D%5Bdata%5D=icp_short
            &columns%5B6%5D%5Bname%5D=
            &columns%5B6%5D%5Bsearchable%5D=true
            &columns%5B6%5D%5Borderable%5D=true
            &columns%5B6%5D%5Bsearch%5D%5Bvalue%5D=
            &columns%5B6%5D%5Bsearch%5D%5Bregex%5D=false
          &columns%5B7%5D%5Bdata%5D=completed
            &columns%5B7%5D%5Bname%5D=
            &columns%5B7%5D%5Bsearchable%5D=true
            &columns%5B7%5D%5Borderable%5D=true
            &columns%5B7%5D%5Bsearch%5D%5Bvalue%5D=
            &columns%5B7%5D%5Bsearch%5D%5Bregex%5D=false
          &order%5B0%5D%5Bcolumn%5D=5&order%5B0%5D%5Bdir%5D=desc&start=${startOffset}&length=50&search%5Bvalue%5D=&search%5Bregex%5D=false`;

        const response = await fetch('https://database.coffeeinstitute.org/api/coffees/arabicaAjax', {
          method: 'POST',
          headers: {
            'Cache-Control': 'no-cache',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
          },
          credentials: 'same-origin',
          body: requestBody
        });

        return response.json();
        // return response.text(); // for debugging HTML errors
      },
      { draw: pageNumber, startOffset: (pageNumber - 1) * 50 }
    );

    origins.push(responseJSON);
  }

  const uniqueIDs = Array.from(
    new Set(
      origins
        .map(({ data }) => data)
        .flat()
        .map(({ random_id: id }) => id)
        .filter(Boolean)
    )
  );

  console.info(`Received ${uniqueIDs.length} items...`);

  const farmDetails = await Promise.all(
    uniqueIDs.map((id) => {
      console.info(`Fetching farm details for ID: ${id}...`);

      return page.evaluate(async (_id) => {
        const response = await fetch(`https://database.coffeeinstitute.org/api/coffee/random/${_id}`, {
          method: 'GET',
          credentials: 'same-origin'
        });

        return response.json();
      }, id);
    })
  );

  const completedFarms = farmDetails.filter(({ stage_title: stage }) => stage === 'Completed');
  const cleanFarms = completedFarms.map(({ country_title: origin, region, farm, altitude }) => ({
    origin: originAliases[origin.trim().toLowerCase()] || origin.trim().toLowerCase(),
    region: region?.trim().toLowerCase(),
    farm:
      !farm || emptyValueStrings.includes(farm.trim().toLowerCase())
        ? undefined
        : farm?.replaceAll('\t', '').trim().toLowerCase(),
    altitude: parseAltitude(altitude)
  }));
  const uniqueOrigins = Array.from(new Set(cleanFarms.map(({ origin }) => origin)));

  const authToken = process.env.TURSO_DEFAULT_TOKEN;
  const databaseUrl = process.env.TURSO_DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('TURSO_DATABASE_URL is not set');
  }

  if (!authToken) {
    throw new Error('TURSO_DEFAULT_TOKEN is not set');
  }

  const client = createClient({
    url: databaseUrl,
    authToken
  });

  console.info('Inserting origins...');
  await client.batch(
    uniqueOrigins.map((origin) => ({
      sql: `INSERT OR IGNORE INTO origin_countries (name) VALUES (:origin)`,
      args: { origin }
    }))
  );

  const uniqueOriginsWithId = await Promise.all(
    uniqueOrigins.map(async (origin) => {
      const { rows } = await client.execute({
        sql: 'SELECT id FROM origin_countries WHERE name = :origin',
        args: {
          origin
        }
      });

      return { origin, originCountryId: rows[0].id };
    })
  );

  console.info('Inserting origin countries i18n...');
  await client.batch(
    uniqueOriginsWithId.map(({ origin, originCountryId }) => ({
      sql: `INSERT OR IGNORE INTO origin_countries_i18n (name, origin_country_id, language_id) VALUES (:origin, :originCountryId, :languageId)`,
      args: { origin, originCountryId, languageId: englishLanguageID }
    }))
  );

  const uniqueRegions = Array.from(
    new Set(
      cleanFarms
        .filter(({ region }) => region)
        .map(({ origin, region }) => {
          const originCountryId = uniqueOriginsWithId.find(
            ({ origin: _origin }) => _origin === origin
          )?.originCountryId;

          if (!originCountryId) {
            throw new Error(`Origin country ID not found for origin: ${origin}`);
          }

          return { originCountryId, region };
        })
    )
  );

  console.info('Inserting regions...');
  await client.batch(
    uniqueRegions.map(({ originCountryId, region }) => ({
      sql: `INSERT OR IGNORE INTO origin_regions (name, origin_country_id) VALUES (:region, :originCountryId)`,
      args: { region, originCountryId }
    }))
  );

  const uniqueRegionsWithID = await Promise.all(
    uniqueRegions.map(async ({ originCountryId, region }) => {
      const { rows } = await client.execute({
        sql: 'SELECT id FROM origin_regions WHERE name = :region AND origin_country_id = :originCountryId',
        args: {
          region,
          originCountryId
        }
      });

      return { originRegionId: rows[0].id, region };
    })
  );

  console.info('Inserting origin regions i18n...');
  await client.batch(
    uniqueRegionsWithID.map(({ originRegionId, region }) => ({
      sql: `INSERT OR IGNORE INTO origin_regions_i18n (name, origin_region_id, language_id) VALUES (:region, :originRegionId, :languageId)`,
      args: { region, originRegionId, languageId: englishLanguageID }
    }))
  );

  console.info('Inserting farms...');
  await client.batch(
    cleanFarms
      .filter(({ farm }) => Boolean(farm))
      .map(({ origin, region, farm, altitude }) => {
        const originCountryId = uniqueOriginsWithId.find(({ origin: _origin }) => _origin === origin)?.originCountryId;
        const originRegionId = uniqueRegionsWithID.find(({ region: _region }) => _region === region)?.originRegionId;

        if (!originCountryId) {
          throw new Error(`Origin country ID not found for origin: ${origin}`);
        }

        if (!originRegionId) {
          throw new Error(`Origin region ID not found for region: ${region}`);
        }

        return {
          sql: `INSERT OR IGNORE INTO origin_farms (name, origin_country_id, origin_region_id, height) VALUES (:farm, :originCountryId, :originRegionId, :altitude)`,
          args: { farm, originCountryId, originRegionId, altitude: altitude || null }
        };
      })
  );
});
