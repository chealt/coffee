import logger from './Sentry/logger.js';
import {
  getBrewingMethod,
  getOriginCountry,
  getOriginFarm,
  getOriginRegion,
  getProcessingMethod,
  getRoaster,
  getTasteNotes,
  getVarieties,
  saveDetails
} from './turso.js';

// eslint-disable-next-line complexity
const handler = async (event) => {
  const filename = event.filename;
  const texts = event.texts.map((text) => text.trim().toLowerCase());

  logger.info(`Processing updated or new item: ${filename}`);

  const [brewingMethod, originCountry, originFarm, originRegion, processingMethod, roaster, tasteNotes, varieties] =
    await Promise.all([
      getBrewingMethod(texts),
      getOriginCountry(texts),
      getOriginFarm(texts),
      getOriginRegion(texts),
      getProcessingMethod(texts),
      getRoaster(texts),
      getTasteNotes(texts),
      getVarieties(texts)
    ]);

  const cleanVarieties = varieties.filter(({ name }) => name.toLowerCase() !== originCountry?.name.toLowerCase()); // filter Colombia from varieties

  logger.info(
    `Found details: ${JSON.stringify({ brewingMethod, originCountry, originFarm, originRegion, processingMethod, roaster, tasteNotes, varieties: cleanVarieties })}`
  );

  await saveDetails({
    filename,
    details: {
      brewingMethod: brewingMethod?.brewing_method_id || '',
      originCountry: originCountry?.origin_country_id || '',
      originFarm: originFarm?.id || '',
      originRegion: originRegion?.origin_region_id || '',
      processingMethod: processingMethod?.processing_method_id || '',
      roaster: roaster?.id || '',
      'tasteNoteIds[]': tasteNotes?.map(({ taste_note_id: id }) => id) || '',
      'varieties[]': cleanVarieties?.map(({ id }) => id) || ''
    }
  });
};

export { handler };
