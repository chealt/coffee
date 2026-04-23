import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { chromium } from 'playwright';
import fs from 'fs/promises';

export const handler = async (event) => {
  const { url, filename, bucketName } = event;

  const browser = await chromium.launch({
    args: ['--disable-dev-shm-usage', '--no-sandbox']
  });
  const page = await browser.newPage();
  await page.goto(url);
  const screenshot = await page.screenshot({ fullPage: true });
  await browser.close();

  if (!process.env.IS_LOCAL) {
    const s3Client = new S3Client();

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: filename,
        Body: screenshot,
        ContentType: 'image/png'
      })
    );

    // eslint-disable-next-line no-else-return
    return { statusCode: 200, body: 'Screenshot uploaded to S3' };
  } else {
    // Local: Save to filesystem
    const outputPath = `/var/task/test-results/${filename}`;
    await fs.writeFile(outputPath, screenshot);

    return { statusCode: 200, body: `Screenshot saved locally at ${outputPath}` };
  }
};
