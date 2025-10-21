const region = import.meta.env?.AWS_REGION || process.env.AWS_REGION;
const accessKeyId = import.meta.env?.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = import.meta.env?.AWS_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;

export { region, accessKeyId, secretAccessKey };
