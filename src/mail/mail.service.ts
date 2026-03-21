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
      pass: process.env.EMAIL_PASS,
    },
  });

  private get from() {
    return `"7EDU LEARNING CENTER" <${process.env.EMAIL_USER}>`;
  }

  async sendVerificationCode(to: string, code: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: 'Tasdiqlash kodi',
      text: `Sizning tasdiqlash kodingiz: ${code}`,
      html: `<b>Sizning tasdiqlash kodingiz: ${code}</b>`,
    });
  }

  async sendResetPasswordLink(email: string, link: string) {
    await this.transporter.sendMail({
      from: this.from,
      to: email,
      subject: 'Parolni tiklash — SevenEdu',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border-radius:16px;border:1px solid #e5e7eb;">
          <h2 style="color:#7c3aed;">Parolni tiklash</h2>
          <p style="color:#374151;">Salom! Parolingizni tiklash uchun quyidagi tugmani bosing:</p>
          <a href="${link}"
             style="display:inline-block;margin:24px 0;padding:12px 28px;background:#7c3aed;color:#fff;border-radius:12px;text-decoration:none;font-weight:600;">
            Parolni tiklash
          </a>
          <p style="color:#6b7280;font-size:13px;">Havola 30 daqiqa davomida amal qiladi.</p>
          <p style="color:#6b7280;font-size:13px;">Agar siz bu so'rovni yubormagan bo'lsangiz, ushbu emailni e'tiborsiz qoldiring.</p>
        </div>
      `,
    });
  }
}