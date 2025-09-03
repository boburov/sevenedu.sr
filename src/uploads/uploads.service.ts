import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import * as path from 'path';

@Injectable()
export class UploadsService {
  private s3: S3Client;
  private bucket: string;
  private region: string;

  constructor(private configService: ConfigService) {
    const aws = this.configService.get('aws');

    this.s3 = new S3Client({
      region: aws.region,
      credentials: {
        accessKeyId: aws.accessKeyId,
        secretAccessKey: aws.secretAccessKey,
      },
    });

    this.bucket = aws.bucket;
    this.region = aws.region;
  }

  async uploadFile(file: Express.Multer.File, folder: 'images' | 'videos') {
    if (!file) {
      throw new Error('File topilmadi. Iltimos, tekshirib ko‘ring.');
    }

    const ext = path.extname(file.originalname);
    const filename = `${folder}/${Date.now()}${ext}`;

    // ✅ Stream orqali upload
    const upload = new Upload({
      client: this.s3,
      params: {
        Bucket: this.bucket,
        Key: filename,
        Body: file.stream, // << stream ishlatilyapti
        ContentType: file.mimetype,
      },
      partSize: 10 * 1024 * 1024, // 10MB bo‘lib yuboradi
      leavePartsOnError: false,
    });

    await upload.done();

    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${filename}`;
  }

  async deleteFile(key: string): Promise<boolean> {
    try {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3.send(deleteCommand);
      return true;
    } catch (error) {
      console.error('S3 faylni o‘chirishda xatolik:', error.message);
      return false;
    }
  }
}
