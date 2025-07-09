import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  S3Client,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';

@Injectable()
export class MigrationService {
  private readonly sourceS3: S3Client;
  private readonly targetS3: S3Client;
  private readonly logger = new Logger(MigrationService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    // eski bucket S3Client
    this.sourceS3 = new S3Client({
      region: config.getOrThrow('AWS_REGION'),
      credentials: {
        accessKeyId: config.getOrThrow('AWS_ACCESS_KEY_ID'),
        secretAccessKey: config.getOrThrow('AWS_SECRET_ACCESS_KEY'),
      },
    });

    // yangi bucket S3Client
    this.targetS3 = new S3Client({
      region: config.getOrThrow('AWS_REGION'),
      credentials: {
        accessKeyId: config.getOrThrow('NEW_AWS_ACCESS_KEY_ID'),
        secretAccessKey: config.getOrThrow('NEW_AWS_SECRET_ACCESS_KEY'),
      },
    });
  }

  async migrateFiles() {
    const oldBucket = this.config.getOrThrow('AWS_BUCKET_NAME');
    const newBucket = this.config.getOrThrow('NEW_AWS_BUCKET_NAME');
    const region = this.config.getOrThrow('AWS_REGION');

    const categories = await this.prisma.coursesCategory.findMany();
    const lessons = await this.prisma.lessons.findMany();

    for (const category of categories) {
      if (!category.thumbnail) continue;

      const oldKey = new URL(category.thumbnail).pathname.slice(1);
      const newKey = `images/${Date.now()}-${oldKey.split('/').pop()}`;

      await this.copyFile(oldBucket, newBucket, oldKey, newKey);

      const newUrl = `https://${newBucket}.s3.${region}.amazonaws.com/${newKey}`;

      await this.prisma.coursesCategory.update({
        where: { id: category.id },
        data: { thumbnail: newUrl },
      });

      this.logger.log(`✅ Thumbnail updated: ${category.id}`);
    }

    for (const lesson of lessons) {
      if (!lesson.videoUrl) continue;

      const oldKey = new URL(lesson.videoUrl).pathname.slice(1);
      const newKey = `videos/${Date.now()}-${oldKey.split('/').pop()}`;

      await this.copyFile(oldBucket, newBucket, oldKey, newKey);

      const newUrl = `https://${newBucket}.s3.${region}.amazonaws.com/${newKey}`;

      await this.prisma.lessons.update({
        where: { id: lesson.id },
        data: { videoUrl: newUrl },
      });

      this.logger.log(`✅ Video updated: ${lesson.id}`);
    }

    return { message: 'All files migrated and URLs updated' };
  }

  private async copyFile(SourceBucket: string, TargetBucket: string, CopySourceKey: string, NewKey: string) {
    const copySource = `${SourceBucket}/${CopySourceKey}`;

    await this.targetS3.send(
      new CopyObjectCommand({
        Bucket: TargetBucket,
        CopySource: copySource,
        Key: NewKey,
      }),
    );
  }
}
