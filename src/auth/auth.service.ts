import { BadRequestException, HttpException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-auth.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { MailService } from 'src/mail/mail.service';
import { VerifyCodeDto } from './dto/verify-code';
import { LoginUserDto } from './dto/login-user.dto';
import { UploadsService } from 'src/uploads/uploads.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class AuthService {
  constructor(
    private mailService: MailService,
    private jwt: JwtService,
    private uploadService: UploadsService,
    private prisma: PrismaService,
  ) { }

  generateAlphanumericId(length = 6): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async cleanExpiredUsers() {
    await this.prisma.user.deleteMany({
      where: {
        isVerified: false,
        codeExpiresAt: {
          lt: new Date(),
        },
      },
    });
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new HttpException('Foydalanuvchi topilmadi', 404);
    }

    const newPassword = Math.random().toString(36).slice(-8);

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    await this.mailService.sendVerificationCode(email, `Yangi parolingiz: ${newPassword}`);

    return { msg: 'Yangi parol emailga yuborildi' };
  }

  async incrementUserCoinByEmail(email: string) {
    console.log('💡 Email kelgan:', email); // ← bu yerda qiymatni ko‘ring

    if (!email) {
      console.error('❌ Email yo‘q');
      throw new BadRequestException('Email required!');
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error('❌ User topilmadi shu email bilan:', email);
      throw new NotFoundException('User topilmadi');
    }

    await this.prisma.user.update({
      where: { email },
      data: {
        coins: user.coins + 1,
      },
    });

    return { success: true, newCoin: user.coins + 1 };
  }

  async register(dto: CreateUserDto) {
    const { email, password, name, surname, phonenumber } = dto;

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) throw new HttpException("Bu email allaqachon ro'yxatdan o'tgan", 400);

    const code = this.generateAlphanumericId();
    const hashedPassword = await bcrypt.hash(password, 10);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

    const user = await this.prisma.user.create({
      data: {
        name,
        surname,
        phonenumber,
        email,
        code,
        coins: +1,
        codeExpiresAt: expiresAt,
        password: hashedPassword,
        isVerified: false,
      },
    });

    await this.mailService.sendVerificationCode(email, code);

    const payload = { sub: user.id, email: user.email };
    return { token: this.jwt.sign(payload) };

  }

  async verify(verifyCode: VerifyCodeDto) {
    const { code, email } = verifyCode;
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) throw new HttpException(`Email not Found`, 404);
    if (user.isVerified) throw new HttpException(`User already verified`, 400);

    if (user.codeExpiresAt && user.codeExpiresAt < new Date()) {
      await this.prisma.user.delete({ where: { email } });
      throw new HttpException("Verification code expired, please register again", 400);
    }

    if (user.code !== code) throw new HttpException("Wrong verification code", 400);

    await this.prisma.user.update({
      where: { email },
      data: {
        isVerified: true,
        code: '',
        codeExpiresAt: null,
      },
    });

    const token = await this.jwt.signAsync({
      sub: user.id,
      email: user.email,
    });

    return { msg: "User verified", token, user };
  }

  async login(loginDto: LoginUserDto) {
    const { email, password } = loginDto;

    const user = await this.prisma.user.findFirst({ where: { email } });

    if (!user) {
      throw new UnauthorizedException("Bunday foydalanuvchi topilmadi");
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      throw new UnauthorizedException("Parol noto‘g‘ri");
    }

    if (!user.isVerified) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          isVerified: true,
        },
      });
    }

    const payload = { sub: user.id, email: user.email };
    return {
      token: this.jwt.sign(payload),
      checkId: {
        userID: user.id,
        username: user.name,
      },
    };
  }

  

}
