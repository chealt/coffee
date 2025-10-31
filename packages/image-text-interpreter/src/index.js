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
  const isRemove = event.Records[0].eventName === 'REMOVE';

  if (!isRemove) {
    const filename = event.Records[0].dynamodb.NewImage.filename.S;
    const texts = JSON.parse(event.Records[0].dynamodb.NewImage.texts.S).map((text) => text.trim().toLowerCase());

    console.info(`Processing updated or new item: ${filename}`);

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

    console.info(
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
        'varieties[]': varieties?.map(({ id }) => id) || ''
      }
    });
  }

  console.info('Remove item event, skipping processing');
};

export { handler };
