const POST = async (context) => {
  const { currency, locale, price, weight } = await context.request.json();

  if (!currency || !locale || !price || !weight) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
  }

  // eslint-disable-next-line new-cap
  const pricePerGram = Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: 2
  }).format(Number(price) / Number(weight));

  return new Response(JSON.stringify({ success: true, pricePerGram }));
};

export { POST };
