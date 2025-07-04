import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS||"bjbv dfdh ghsl lyko",
    },
  });

  async sendVerificationCode(to: string, code: string): Promise<void> {
    await this.transporter.sendMail({
      from: `"7EDU LEARNING CENTER" boburovshukurullo@gmail.com`,
      to,
      subject: 'Tasdiqlash kodi',
      text: `Sizning tasdiqlash kodingiz: ${code}`,
      html: `<b>Sizning tasdiqlash kodingiz: ${code}</b>`,
    });
  }
}
