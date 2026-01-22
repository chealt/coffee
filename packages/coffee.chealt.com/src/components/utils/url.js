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
  tasteNote,
  tasteNoteGroup,
  variety
}) =>
  getRelativeLocaleUrl(
    locale,
    `${brewingMethod ? `/brewing-methods/${encodeSafeURL(brewingMethod)}` : ''}${brewingMethodGroup ? `/brewing-method-groups/${encodeSafeURL(brewingMethodGroup)}` : ''}${country ? `/countries/${encodeSafeURL(country)}` : ''}${originCountry ? `/origin-countries/${encodeSafeURL(originCountry)}` : ''}${processingMethod ? `/processing-methods/${encodeSafeURL(processingMethod)}` : ''}${roaster ? `/roasters/${encodeSafeURL(roaster)}` : ''}${tasteNote ? `/taste-notes/${encodeSafeURL(tasteNote)}` : ''}${tasteNoteGroup ? `/taste-note-groups/${encodeSafeURL(tasteNoteGroup)}` : ''}${variety ? `/varieties/${variety.toLowerCase()}` : ''}`
  );

const getSafeUrlWithStats = ({
  locale,
  brewingMethod,
  brewingMethodGroup,
  country,
  originCountry,
  processingMethod,
  roaster,
  tasteNote,
  tasteNoteGroup,
  variety
}) =>
  `${getSafeUrl({ locale, brewingMethod, brewingMethodGroup, country, originCountry, processingMethod, roaster, tasteNote, tasteNoteGroup, variety })}stats`;

export { getSafeUrl, getSafeUrlWithStats };
