const normalize = (string) => string.normalize('NFD').replace(/[\u0300-\u036f]/gu, '');
const removeSpaces = (string) => string.replaceAll(' ', '');
const encodeSafeURL = (string) => encodeURIComponent(string.replaceAll(' ', '-').replaceAll('&', '-and-'));
const decodeSafeURL = (string) => decodeURIComponent(string.replaceAll('-and-', '&').replaceAll('-', ' '));
const friendlyIncludes = (haystack, needle) =>
  haystack.toLowerCase().includes(removeSpaces(normalize(needle.toLowerCase()))) ||
  haystack.toLowerCase().includes(normalize(needle.toLowerCase()));
const capitalize = (string) => string.charAt(0).toUpperCase() + string.slice(1);
const titleCase = (string) => {
  const words = string.toLowerCase().split(' ');

  return words.reduce(
    (titleCaseString, word, index) => `${titleCaseString}${index === 0 ? '' : ' '}${capitalize(word)}`,
    ''
  );
};

export { capitalize, normalize, friendlyIncludes, titleCase, encodeSafeURL, decodeSafeURL };
