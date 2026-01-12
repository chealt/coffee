import { getRelativeLocaleUrl } from 'astro:i18n';

import { encodeSafeURL } from '../../utils/string.js';

const getSafeUrl = ({
  locale,
  brewingMethod,
  brewingMethodGroup,
  country,
  originCountry,
  processingMethod,
  roaster,
  variety
}) =>
  getRelativeLocaleUrl(
    locale,
    `${brewingMethod ? `/brewing-methods/${encodeSafeURL(brewingMethod)}` : ''}${brewingMethodGroup ? `/brewing-method-groups/${encodeSafeURL(brewingMethodGroup)}` : ''}${country ? `/countries/${encodeSafeURL(country)}` : ''}${originCountry ? `/origin-countries/${encodeSafeURL(originCountry)}` : ''}${processingMethod ? `/processing-methods/${processingMethod}` : ''}${roaster ? `/roasters/${encodeSafeURL(roaster)}` : ''}${variety ? `/varieties/${variety}` : ''}`
  );

const getSafeUrlWithStats = ({
  locale,
  brewingMethod,
  brewingMethodGroup,
  country,
  originCountry,
  processingMethod,
  roaster,
  variety
}) =>
  `${getSafeUrl({ locale, brewingMethod, brewingMethodGroup, country, originCountry, processingMethod, roaster, variety })}stats`;

export { getSafeUrl, getSafeUrlWithStats };
