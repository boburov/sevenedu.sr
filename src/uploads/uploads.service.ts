import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import * as path from 'path';
import * as fs from 'fs';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';

@Injectable()
export class UploadsService {
  private s3: S3Client;
  private bucket: string;
  private region: string;
  private uploadDir: string;
  private publicBaseUrl: string;

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

    const upload = this.configService.get('upload') || {};
    this.uploadDir = upload.dir || path.join(process.cwd(), 'uploads');
    this.publicBaseUrl = (upload.publicBaseUrl || '').replace(/\/+$/, '');
  }

  /**
   * Faylni VPS diskiga (lokal) saqlaydi va to'liq URL qaytaradi.
   * Yangi pfp / kurs thumbnaillari shu metod orqali boradi (S3 emas).
   * Eski (S3) URL'lar bazada o'zgarmasdan qoladi.
   */
  async uploadLocalFile(
    file: Express.Multer.File,
    folder: string,
  ): Promise<string> {
    if (!file) {
      throw new Error('File topilmadi. Iltimos, tekshirib ko‘ring.');
    }

    const dir = path.join(this.uploadDir, folder);
    await fs.promises.mkdir(dir, { recursive: true });

    const ext = path.extname(file.originalname) || '';
    const filename = `${Date.now()}-${randomUUID()}${ext}`;
    const filePath = path.join(dir, filename);

    if (file.buffer) {
      await fs.promises.writeFile(filePath, file.buffer);
    } else if ((file as any).path) {
      // disk storage holatida — faylni ko'chiramiz
      await fs.promises.rename((file as any).path, filePath);
    } else if (file.stream && 'pipe' in file.stream) {
      await new Promise<void>((resolve, reject) => {
        const ws = fs.createWriteStream(filePath);
        (file.stream as Readable).pipe(ws);
        ws.on('finish', () => resolve());
        ws.on('error', reject);
      });
    } else {
      throw new Error('Faylda buffer yoki stream topilmadi');
    }

    return `${this.publicBaseUrl}/uploads/${folder}/${filename}`;
  }

  /** URL bizning VPS uploads papkamizdagi faylga ishora qiladimi? */
  private isLocalUrl(url?: string): boolean {
    return (
      !!url && !!this.publicBaseUrl && url.startsWith(`${this.publicBaseUrl}/uploads/`)
    );
  }

  /**
   * Faqat VPS'dagi lokal faylni o'chiradi. Eski S3 / tashqi URL'larga tegmaydi
   * (ularni o'chirib yubormaslik uchun — "eskilarini emas").
   */
  async deleteLocalFile(url?: string): Promise<boolean> {
    try {
      if (!this.isLocalUrl(url)) return false;
      const rel = url!.substring(`${this.publicBaseUrl}/uploads/`.length);
      // path traversal'dan himoya
      const filePath = path.normalize(path.join(this.uploadDir, rel));
      if (!filePath.startsWith(path.normalize(this.uploadDir))) return false;
      await fs.promises.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async uploadFile(file: Express.Multer.File, folder: 'images' | 'videos') {
    if (!file) {
      throw new Error('File topilmadi. Iltimos, tekshirib ko‘ring.');
    }

    // ✅ To'g'ri stream yaratish
    let fileStream: Readable;

    if (file.stream && typeof file.stream === 'object' && 'on' in file.stream) {
      // Agar file.stream Node.js Readable stream bo'lsa
      fileStream = file.stream as Readable;
    } else if (file.buffer) {
      // Agar buffer mavjud bo'lsa, undan Readable stream yaratish
      fileStream = Readable.from(file.buffer);
    } else {
      throw new Error('Faylda stream yoki buffer topilmadi');
    }

    const ext = path.extname(file.originalname);
    const filename = `${folder}/${Date.now()}${ext}`;

    // ✅ Stream orqali upload
    const upload = new Upload({
      client: this.s3,
      params: {
        Bucket: this.bucket,
        Key: filename,
        Body: fileStream, // << Endi to'g'ri tur
        ContentType: file.mimetype,
      },
      partSize: 10 * 1024 * 1024, // 10MB bo'lib yuboradi
      leavePartsOnError: false,
    });

    await upload.done();

    return `https://s3.${this.region}.amazonaws.com/${this.bucket}/${filename}`;
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
      console.error("S3 faylni o'chirishda xatolik:", error.message);
      return false;
    }
  }
}
