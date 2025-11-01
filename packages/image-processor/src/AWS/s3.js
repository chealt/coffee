import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const client = new S3Client({
  region: 'eu-central-1'
});

const getObject = async ({ bucketName, key }) => {
  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucketName,
      Key: key
    })
  );

  return response.Body.transformToByteArray();
};

const putObject = async ({ bucketName, key, data, contentType }) =>
  client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
      Body: data
    })
  );

export { getObject, putObject };
