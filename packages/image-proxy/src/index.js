const handler = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    const cache = caches.default;
    let response = await cache.match(request);

    if (!response) {
      const cloudfrontUrl = new URL(url.pathname.replace('/images', ''), `https://${env.CLOUDFRONT_DOMAIN}`);

      console.info(`Fetching ${cloudfrontUrl}`);

      response = await fetch(new Request(cloudfrontUrl, request));

      if (response.status === 200) {
        response = new Response(response.body, response);
        response.headers.set('Access-Control-Allow-Origin', '*');
        response.headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
        response.headers.set('Cache-Control', 'public, max-age=31556952, immutable');

        ctx.waitUntil(cache.put(request, response.clone()));
      }
    }

    return response;
  }
};

export default handler;
