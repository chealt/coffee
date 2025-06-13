const onRequest = async (context, next) => {
  const userAgent = context.request.headers.get('user-agent');
  const isIOS = /iPad|iPhone|iPod/u.test(userAgent);

  context.locals.clientSideOCR = !isIOS;

  return next();
};

export { onRequest };
