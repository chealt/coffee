const normalize = (string) => string.normalize('NFD').replace(/[\u0300-\u036f]/gu, '');
const removeSpaces = (string) => string.replaceAll(' ', '');
const friendlyIncludes = (haystack, needle) =>
  haystack.toLowerCase().includes(removeSpaces(normalize(needle.toLowerCase()))) ||
  haystack.toLowerCase().includes(normalize(needle.toLowerCase()));

export { normalize, friendlyIncludes };
