import { getSessionUser } from '../../../server/authentication/session.js';
import logger from '../../../server/utils/logger.js';

const recommendationsData = import.meta.glob('../../../../data/recommendations/*.json', { eager: true });

const GET = async (context) => {
  let loggedInUser;

  try {
    loggedInUser = getSessionUser(context);
  } catch {
    logger.info('Not logged in, using anonymous recommendations');
  }

  const recommendedKey = Object.keys(recommendationsData).find(
    (key) => key === `../../../../data/recommendations/${loggedInUser ? loggedInUser.username : 'anonymous'}.json`
  );

  const recommendations = recommendationsData[recommendedKey];

  if (!recommendations) {
    logger.info(`Could not find recommendations for ${loggedInUser.username}`);

    return new Response(JSON.stringify({ success: false }), { status: 404 });
  }

  return new Response(
    JSON.stringify({
      recommendations: {
        coffees: recommendations.coffees,
        originCountries: recommendations.originCountries,
        roasters: recommendations.roasters,
        tasteNoteGroups: recommendations.tasteNoteGroups
      }
    })
  );
};

export { GET };
