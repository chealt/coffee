import { getRelativeLocaleUrl } from 'astro:i18n';

import { encodeSafeURL } from '../../utils/string.js';

const getSafeUrl = ({ locale, brewingMethod, brewingMethodGroup, country, originCountry, processingMethod, variety }) =>
  getRelativeLocaleUrl(
    locale,
    `${brewingMethod ? `/brewing-methods/${encodeSafeURL(brewingMethod)}` : ''}${brewingMethodGroup ? `/brewing-method-groups/${encodeSafeURL(brewingMethodGroup)}` : ''}${country ? `/countries/${encodeSafeURL(country)}` : ''}${originCountry ? `/origin-countries/${encodeSafeURL(originCountry)}` : ''}${processingMethod ? `/processing-methods/${processingMethod}` : ''}${variety ? `/varieties/${variety}` : ''}`
  );

const getSafeUrlWithStats = ({
  locale,
  brewingMethod,
  brewingMethodGroup,
  country,
  originCountry,
  processingMethod,
  variety
}) =>
  `${getSafeUrl({ locale, brewingMethod, brewingMethodGroup, country, originCountry, processingMethod, variety })}stats`;

export { getSafeUrl, getSafeUrlWithStats };
