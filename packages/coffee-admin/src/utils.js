const capitalize = (string) => string.charAt(0).toUpperCase() + string.slice(1);
const titleCase = (string) => {
  const words = string.toLowerCase().split(' ');

  return words.reduce(
    (titleCaseString, word, index) => `${titleCaseString}${index === 0 ? '' : ' '}${capitalize(word)}`,
    ''
  );
};
const convertToHex = (arrayBuffer) =>
  Array.from(new Uint8Array(arrayBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

const getContentHash = async ({ arrayBuffer, algorithm = 'SHA-256' }) => {
  const hashBuffer = await crypto.subtle.digest(algorithm, arrayBuffer);

  return convertToHex(hashBuffer);
};

export { getContentHash, titleCase };
