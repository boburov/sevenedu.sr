import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  async sendVerificationCode(to: string, code: string): Promise<void> {
    await this.transporter.sendMail({
      from: `7EDU LEARNING CENTER`,
      to,
      subject: 'Tasdiqlash kodi',
      text: `Sizning tasdiqlash kodingiz: ${code}`,
      html: `<b>Sizning tasdiqlash kodingiz: ${code}</b>`,
    });
  }
}
