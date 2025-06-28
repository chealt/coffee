import { generateUploadUrl } from '../../../server/cloudflare/r2/storage';

const GET = async ({ request }) => {
  const { username, filename, contentType } = await request.json();

  try {
    const url = await generateUploadUrl({ username, filename, contentType });

    return new Response(JSON.stringify({ url }), { status: 200 });
  } catch (error) {
    console.error(error); // eslint-disable-line no-console

    return new Response(JSON.stringify({ error: 'Failed to generate upload URL' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export { GET };
