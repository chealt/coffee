import { convertToUSD } from '../../components/coffees/utils.js';
import { getSimilarCoffeePrices } from '../../server/database/collections';

const POST = async ({ request }) => {
  const { currency, pricePerGram, originCountry, originRegion, processingMethod, varieties } = await request.json();

  let priceRanges;

  const similarPrices = await getSimilarCoffeePrices({
    originCountry,
    originRegion,
    processingMethod,
    varieties
  });

  if (similarPrices.length >= 10) {
    const pricePerGramInUSD = convertToUSD({ price: pricePerGram, currency });
    const rangeStep = (similarPrices[similarPrices.length - 1] - similarPrices[0]) / 10;

    for (let i = 0; i < 10; i++) {
      const rangeStart = similarPrices[0] + i * rangeStep;
      const rangeEnd = rangeStart + rangeStep;
      const countInRange = similarPrices.filter((p) => p >= rangeStart && p < rangeEnd).length;

      priceRanges = priceRanges || [];
      priceRanges.push({
        isInRange: pricePerGramInUSD >= rangeStart && pricePerGramInUSD < rangeEnd,
        count: countInRange
      });
    }
  }
};

export { POST };
