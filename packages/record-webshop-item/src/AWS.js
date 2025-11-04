import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const s3 = new S3Client({
  region: 'eu-central-1'
});

const putObject = async ({ Bucket, Key, ContentType, Body, Metadata }) =>
  s3.send(
    new PutObjectCommand({
      Bucket,
      ContentType,
      Key,
      Body,
      Metadata
    })
  );

export { putObject };
