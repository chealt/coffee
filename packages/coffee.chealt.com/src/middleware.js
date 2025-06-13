const onRequest = async (context, next) => {
  const userAgent = context.request.headers.get('user-agent');
  const isIOS = /iPad|iPhone|iPod/u.test(userAgent);

  console.log(`userAgent: ${userAgent}`);
  console.log(`isIOS: ${isIOS}`);

  context.locals.clientSideOCR = !isIOS;

  console.log(`context.locals.clientSideOCR: ${context.locals}`);

  return next();
};

export { onRequest };
