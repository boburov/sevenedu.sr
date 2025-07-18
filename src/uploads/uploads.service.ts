import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  CompletedPart,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import * as path from 'path';

@Injectable()
export class UploadsService {
  private s3: S3Client;
  private bucket: string;
  private region: string;

  private readonly MAX_SINGLE_UPLOAD = 100 * 1024 * 1024; // 100MB
  private readonly CHUNK_SIZE = 10 * 1024 * 1024; // 10MB

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

    if (file.buffer.length > this.MAX_SINGLE_UPLOAD) {
      return this.uploadLargeFile(file, folder);
    }

    const ext = path.extname(file.originalname);
    const filename = `${folder}/${Date.now()}${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: filename,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await this.s3.send(command);

    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${filename}`;
  }

  private async uploadLargeFile(file: Express.Multer.File, folder: 'images' | 'videos') {
    const ext = path.extname(file.originalname);
    const filename = `${folder}/${Date.now()}${ext}`;

    const createCommand = new CreateMultipartUploadCommand({
      Bucket: this.bucket,
      Key: filename,
      ContentType: file.mimetype,
    });

    const createResponse = await this.s3.send(createCommand);
    const uploadId = createResponse.UploadId;
    if (!uploadId) throw new Error('Multipart upload yaratib bo‘lmadi.');

    const parts: CompletedPart[] = [];

    for (let partNumber = 1, start = 0; start < file.buffer.length; partNumber++) {
      const end = Math.min(start + this.CHUNK_SIZE, file.buffer.length);
      const partBuffer = file.buffer.slice(start, end);

      const uploadPartCommand = new UploadPartCommand({
        Bucket: this.bucket,
        Key: filename,
        UploadId: uploadId,
        PartNumber: partNumber,
        Body: partBuffer,
      });

      const uploadPartResponse = await this.s3.send(uploadPartCommand);

      parts.push({
        ETag: uploadPartResponse.ETag,
        PartNumber: partNumber,
      });

      start = end;
    }

    const completeCommand = new CompleteMultipartUploadCommand({
      Bucket: this.bucket,
      Key: filename,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts,
      },
    });

    await this.s3.send(completeCommand);

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
