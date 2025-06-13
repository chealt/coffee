const onRequest = async (context, next) => {
  const userAgent = context.request.headers.get('user-agent');
  const isIOS = /iPad|iPhone|iPod/u.test(userAgent);

  context.locals.clientSideOCR = !isIOS;

  console.log(`context.locals.clientSideOCR: ${context.locals.clientSideOCR}`); // eslint-disable-line no-console

  return next();
};

export { onRequest };
