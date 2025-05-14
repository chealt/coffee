const normalize = (string) => string.normalize('NFD').replace(/[\u0300-\u036f]/gu, '');

export { normalize };
