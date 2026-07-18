import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import axios from 'axios';
import * as FormData from 'form-data';
import { Readable } from 'stream';

/**
 * Do'kon mahsulot rasmlarini Telegram guruhda saqlaydi. Bot token faqat shu
 * serverda qoladi — mobil/admin rasmni server proxy (getFileStream) orqali oladi,
 * shuning uchun token hech qachon clientga chiqmaydi.
 */
@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly token = process.env.TELEGRAM_BOT_TOKEN || '';
  private readonly chatId = process.env.TELEGRAM_CHAT_ID || '';

  private get api(): string {
    return `https://api.telegram.org/bot${this.token}`;
  }

  private ensureConfigured() {
    if (!this.token || !this.chatId) {
      throw new InternalServerErrorException(
        'Telegram sozlanmagan: TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID kerak',
      );
    }
  }

  /** Rasmni guruhga yuboradi va eng katta o'lchamli photo file_id ni qaytaradi. */
  async uploadImage(file: Express.Multer.File): Promise<string> {
    this.ensureConfigured();
    const form = new FormData();
    form.append('chat_id', this.chatId);
    form.append('photo', file.buffer, {
      filename: file.originalname || 'product.jpg',
      contentType: file.mimetype || 'image/jpeg',
    });

    try {
      const res = await axios.post(`${this.api}/sendPhoto`, form, {
        headers: form.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 30000,
      });
      const photos = res.data?.result?.photo as Array<{ file_id: string }>;
      if (!photos?.length) {
        throw new Error('Telegram javobida photo yo‘q');
      }
      // Eng katta o'lcham — massivning oxirgi elementi.
      return photos[photos.length - 1].file_id;
    } catch (e: any) {
      this.logger.error(
        `Telegram sendPhoto xato: ${e?.response?.data?.description || e.message}`,
      );
      throw new InternalServerErrorException('Rasmni Telegramga yuklab bo‘lmadi');
    }
  }

  /** file_id → Telegram vaqtinchalik download URL. */
  private async getFileUrl(fileId: string): Promise<string> {
    this.ensureConfigured();
    const res = await axios.get(`${this.api}/getFile`, {
      params: { file_id: fileId },
      timeout: 15000,
    });
    const filePath = res.data?.result?.file_path;
    if (!filePath) throw new InternalServerErrorException('Telegram fayl topilmadi');
    return `https://api.telegram.org/file/bot${this.token}/${filePath}`;
  }

  /** Rasm baytlarini stream sifatida oladi (server proxy uchun). */
  async getFileStream(
    fileId: string,
  ): Promise<{ stream: Readable; contentType: string }> {
    const url = await this.getFileUrl(fileId);
    const res = await axios.get(url, {
      responseType: 'stream',
      timeout: 30000,
    });
    return {
      stream: res.data as Readable,
      contentType: (res.headers['content-type'] as string) || 'image/jpeg',
    };
  }
}
