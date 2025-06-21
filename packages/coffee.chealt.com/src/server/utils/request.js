const reservedCookieWords = ['path', 'domain', 'expires', 'max-age', 'secure', 'httponly', 'samesite'];

const parseCookie = (request) => {
  const cookie = request.headers.get('cookie');

  return cookie?.split('; ').reduce((acc, row) => {
    if (row.includes('=')) {
      const [key, value] = row.split('=');
      const cookieName = key.trim();

      if (!reservedCookieWords.includes(cookieName.toLowerCase())) {
        acc[cookieName] = value.slice(0, value.indexOf(';') + 1);
      }
    }

    return acc;
  }, {});
};

export { parseCookie };
