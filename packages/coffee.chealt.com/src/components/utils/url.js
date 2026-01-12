import { getRelativeLocaleUrl } from 'astro:i18n';

import { encodeSafeURL } from '../../utils/string.js';

const getSafeUrl = ({ locale, brewingMethod, country, originCountry, processingMethod, variety }) =>
  getRelativeLocaleUrl(
    locale,
    `${brewingMethod ? `/brewing-methods/${brewingMethod}` : ''}${country ? `/countries/${encodeSafeURL(country)}` : ''}${originCountry ? `/origin-countries/${encodeSafeURL(originCountry)}` : ''}${processingMethod ? `/processing-methods/${processingMethod}` : ''}${variety ? `/varieties/${variety}` : ''}`
  );

export { getSafeUrl };
