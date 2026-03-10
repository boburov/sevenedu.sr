import { BadRequestException, ConflictException, HttpException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-auth.dto';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { MailService } from '../mail/mail.service';
import { VerifyCodeDto } from './dto/verify-code';
import { LoginUserDto } from './dto/login-user.dto';
import { UploadsService } from '../uploads/uploads.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class AuthService {
  constructor(
    private mailService: MailService,
    private jwt: JwtService,
    private uploadService: UploadsService,
    private prisma: PrismaService,
  ) { }

  private makeUsername(googleId: string) {
    return `u_${googleId}`.slice(0, 30);
  }

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
    if (existingUser) throw new HttpException("Bu email allaqachon ro'yxatdan o'tgan", 409);

    const code = this.generateAlphanumericId();
    const hashedPassword = await bcrypt.hash(password, 10);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);

    const user = await this.prisma.user.create({
      data: {
        name,
        surname,
        username: email,
        register_type: "REGULAR",
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

    if (user.register_type !== "REGULAR") throw new HttpException("Siz Google Orqali Ro'yxatdan O'tgansiz", 409);

    const isPasswordMatch = await bcrypt.compare(password, String(user.password));

    if (!isPasswordMatch) {
      throw new UnauthorizedException("Parol noto‘g‘ri");
    }

    if (!user.isVerified) {
      throw new HttpException("Emailingizni tasdiqlang", 403);
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

  async googleLogin(googleUser: any) {
    const email = googleUser?.email;
    const googleId = googleUser?.id;

    if (!email) throw new BadRequestException("Google account has no email");
    if (!googleId) throw new BadRequestException("Google account has no id");

    const existingByProvider = await this.prisma.user.findUnique({
      where: { providerId: googleId },
    });

    const existingByEmail = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingByProvider && existingByEmail &&
      existingByProvider.id !== existingByEmail.id) {
      throw new ConflictException("This Google account is already linked to another user");
    }

    const user = existingByEmail || existingByProvider;

    // ✅ Block REGULAR users from using Google login
    if (user && user.register_type === "REGULAR") {
      throw new HttpException(
        "Siz oddiy ro'yxatdan o'tgansiz. Iltimos, email va parol bilan kiring.",
        409
      );
    }

    if (user) {
      // Existing GOOGLE user — update and sign in
      const updatedUser = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          provider: "google",
          providerId: googleId,
          isVerified: true,
          register_type: "GOOGLE",
          profilePic: googleUser.photo || user.profilePic,
          name: user.name || googleUser.firstName,
          surname: user.surname || googleUser.lastName,
          lastLoginAt: new Date(),
        },
      });
      const token = await this.jwt.signAsync({ sub: updatedUser.id, email: updatedUser.email });
      return { token, user: updatedUser };
    }

    // Brand new user — create
    const baseUsername = this.makeUsername(googleId);
    let username = baseUsername;
    const exists = await this.prisma.user.findUnique({ where: { username } });
    if (exists) username = `${baseUsername}_${Date.now().toString().slice(-5)}`.slice(0, 30);

    const newUser = await this.prisma.user.create({
      data: {
        email,
        username,
        name: googleUser.firstName || "",
        surname: googleUser.lastName || "",
        profilePic: googleUser.photo || "",
        isVerified: true,
        register_type: "GOOGLE",
        provider: "google",
        providerId: googleId,
        lastLoginAt: new Date(),
      },
    });

    const token = await this.jwt.signAsync({ sub: newUser.id, email: newUser.email });
    return { token, user: newUser };
  }
}
