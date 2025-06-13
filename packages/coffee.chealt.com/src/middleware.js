const onRequest = async (context, next) => {
  const userAgent = context.request.headers.get('user-agent');
  const isIOS = /iPad|iPhone|iPod/u.test(userAgent);

  console.log(userAgent);

  context.locals.clientSideOCR = !isIOS;

  console.log(context.locals.clientSideOCR);

  return next();
};

export { onRequest };
