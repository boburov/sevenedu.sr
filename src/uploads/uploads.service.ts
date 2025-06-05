import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import * as path from 'path';

@Injectable()
export class UploadsService {
  private s3: S3Client;
  
  constructor(private configService: ConfigService) {
    this.s3 = new S3Client({
      region: this.configService.getOrThrow('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.getOrThrow('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.getOrThrow('AWS_SECRET_ACCESS_KEY'),
      },
    });
  }

  async uploadFile(file: Express.Multer.File, folder: 'images' | 'videos') {
    if (!file) {
      throw new Error('File topilmadi. Iltimos, tekshiring!');
    }

    const ext = path.extname(file.originalname);
    const filename = `${folder}/${Date.now()}${ext}`;
    const bucket = this.configService.getOrThrow('AWS_BUCKET_NAME');
    const region = this.configService.getOrThrow('AWS_REGION');

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: filename,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read',
    });

    await this.s3.send(command);

    return `https://${bucket}.s3.${region}.amazonaws.com/${filename}`;
  }

  async deleteFile(key: string): Promise<boolean> {
    try {
      const bucket = this.configService.getOrThrow('AWS_BUCKET_NAME');

      const deleteCommand = new DeleteObjectCommand({
        Bucket: bucket,
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
