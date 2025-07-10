import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { Injectable, Logger } from '@nestjs/common';
import { Readable } from 'stream';

@Injectable()
export class MigirationService {
  private readonly logger = new Logger(MigirationService.name);

  private readonly oldS3 = new S3Client({
  region: 'eu-north-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
});

  private readonly newS3 = new S3Client({
  region: 'eu-north-1',
  credentials: {
    accessKeyId: process.env.NEW_AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.NEW_AWS_SECRET_ACCESS_KEY as string,
  },
});

  private readonly oldBucket = process.env.AWS_BUCKET_NAME;
  private readonly newBucket = process.env.NEW_AWS_BUCKET_NAME;

  async migrateAllFiles(): Promise<void> {
    this.logger.log('🚀 Fayllarni olishni boshladim...');

    const listCommand = new ListObjectsV2Command({
      Bucket: this.oldBucket,
    });

    const listResponse = await this.oldS3.send(listCommand);

    const contents = listResponse.Contents || [];

    if (contents.length === 0) {
      this.logger.warn('❗ Hech qanday fayl topilmadi.');
      return;
    }

    for (const file of contents) {
      const key = file.Key;
      this.logger.log(`▶️ Fayl ko‘chirilmoqda: ${key}`);

      try {
        const getCommand = new GetObjectCommand({
          Bucket: this.oldBucket,
          Key: key,
        });

        const response = await this.oldS3.send(getCommand);
        const stream = response.Body as Readable;

        const chunks: Buffer[] = [];
        for await (const chunk of stream) {
          chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
        }

        const putCommand = new PutObjectCommand({
          Bucket: this.newBucket,
          Key: key,
          Body: Buffer.concat(chunks),
          ContentType: response.ContentType,
        });

        await this.newS3.send(putCommand);
        this.logger.log(`✅ Fayl ko‘chirildi: ${key}`);
      } catch (error) {
        this.logger.error(`❌ Xato: ${key}`, error);
      }
    }

    this.logger.log('🎉 Barcha fayllar muvaffaqiyatli ko‘chirildi.');
  }
}
