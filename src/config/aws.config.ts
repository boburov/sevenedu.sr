export default () => ({
    aws: {
        region: process.env.AWS_REGION,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        bucket: process.env.AWS_BUCKET_NAME,
    },
    newAws: {
        region: process.env.AWS_REGION,
        accessKeyId: process.env.NEW_AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.NEW_AWS_SECRET_ACCESS_KEY,
        bucket: process.env.NEW_AWS_BUCKET_NAME,
    },
});
