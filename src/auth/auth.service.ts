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
import { LoginAdminDto } from './dto/login-admin.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private mailService: MailService,
    private jwt: JwtService,
    private prisma: PrismaService,
    private configService: ConfigService
  ) { }

  private makeUsername(googleId: string) {
    return `u_${googleId}`.slice(0, 30);
  }

  /**
   * Agar hali birorta admin bo'lmasa, .env dagi ADMIN_* dan birinchi OWNER'ni yaratadi.
   * Bu ownerning hozirgi login/paroli DB migratsiyadan keyin ham ishlashini ta'minlaydi.
   */
  private async ensureOwnerBootstrap() {
    const count = await this.prisma.adminUser.count();
    if (count > 0) return;

    const stripQuotes = (v?: string) =>
      (v ?? '').trim().replace(/^['"]|['"]$/g, '').trim();

    const email = stripQuotes(
      this.configService.get<string>('ADMIN_EMAIL') ?? process.env.ADMIN_EMAIL,
    ).toLowerCase();
    const plainPassword = stripQuotes(
      this.configService.get<string>('ADMIN_PASSWORD') ??
        process.env.ADMIN_PASSWORD,
    );
    const name =
      stripQuotes(this.configService.get<string>('ADMIN_NAME')) || 'Owner';
    const surname =
      stripQuotes(this.configService.get<string>('ADMIN_SURNAME')) || '';

    if (!email || !plainPassword) {
      console.error(
        "[ensureOwnerBootstrap] ADMIN_EMAIL/ADMIN_PASSWORD .env da yo'q — owner yaratilmadi",
      );
      return;
    }

    const hashed = await bcrypt.hash(plainPassword, 10);
    await this.prisma.adminUser.create({
      data: {
        name,
        surname: surname || null,
        email,
        password: hashed,
        role: 'OWNER',
        permissions: [],
        isActive: true,
      },
    });
    console.log('[ensureOwnerBootstrap] Birinchi OWNER yaratildi:', email);
  }

  async adminLogin(dto: LoginAdminDto) {
    // Birinchi kirishda .env dan owner'ni DB ga ko'chiramiz.
    await this.ensureOwnerBootstrap();

    const inputEmail = (dto.email ?? '').trim().toLowerCase();
    const inputPassword = (dto.password ?? '').trim();

    const admin = await this.prisma.adminUser.findUnique({
      where: { email: inputEmail },
    });

    if (!admin) {
      throw new UnauthorizedException("Email yoki parol noto'g'ri");
    }
    if (!admin.isActive) {
      throw new UnauthorizedException('Akkaunt bloklangan');
    }

    const ok = await bcrypt.compare(inputPassword, admin.password);
    if (!ok) {
      throw new UnauthorizedException("Email yoki parol noto'g'ri");
    }

    const payload = {
      sub: admin.id,
      adminId: admin.id,
      email: admin.email,
      role: admin.role,
      isAdmin: true,
    };

    const token = this.jwt.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '24h',
    });

    return {
      success: true,
      token,
      user: {
        id: admin.id,
        name: admin.name,
        surname: admin.surname,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions,
        isAuthenticated: true,
      },
    };
  }

  // Parolni solishtirish (oddiy yoki bcrypt)
  private async comparePassword(inputPassword: string, storedPassword: string): Promise<boolean> {
    // Agar .env dagi parol oddiy matn bo'lsa:
    if (!storedPassword.startsWith('$2b$')) {
      return inputPassword === storedPassword;
    }

    // Agar bcrypt hash bo'lsa:
    return bcrypt.compare(inputPassword, storedPassword);
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
    if (!user) throw new HttpException('Foydalanuvchi topilmadi', 404);

    if (user.register_type === 'GOOGLE') {
      throw new HttpException("Siz Google orqali ro'yxatdan o'tgansiz", 409);
    }

    // Generate secure token
    const resetToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    await this.prisma.user.update({
      where: { email },
      data: {
        resetToken,
        resetTokenExpiresAt: expiresAt,
      },
    });

    const resetLink = `${process.env.FRONTEND_ORIGIN}/auth/reset-password?token=${resetToken}`;
    await this.mailService.sendResetPasswordLink(email, resetLink);

    return { msg: 'Parol tiklash havolasi emailga yuborildi' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: { resetToken: token },
    });

    if (!user) throw new HttpException('Havola yaroqsiz', 400);

    if (user.resetTokenExpiresAt && user.resetTokenExpiresAt < new Date()) {
      throw new HttpException('Havola muddati tugagan, qayta urinib koring', 400);
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        resetToken: null,
        resetTokenExpiresAt: null,
      },
    });

    return { msg: 'Parol muvaffaqiyatli yangilandi' };
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

  // Google ID token uchun ruxsat etilgan audience'lar.
  // Mobil (google_sign_in) tokenining `aud` qiymati serverClientId ga teng,
  // web client esa GOOGLE_CLIENT_ID dan foydalanadi. Ikkalasi ham qabul qilinadi.
  private googleAudiences(): string[] {
    const mobileClientId =
      this.configService.get<string>('GOOGLE_MOBILE_CLIENT_ID') ||
      '496654947492-m717p6v03d4k03r3r9b4sp30jkt0m2hp.apps.googleusercontent.com';
    const webClientId = this.configService.get<string>('GOOGLE_CLIENT_ID') || '';
    return [mobileClientId, webClientId].filter(Boolean);
  }

  async googleMobileAuth(idToken: string) {
    // ID token'ni Google'ning ochiq kalitlari bilan tekshiramiz:
    // imzo, muddat, issuer va audience (aud) — tokeninfo'dan farqli o'laroq
    // bu yerda token aynan bizning ilovamiz uchun berilganini ham tasdiqlaymiz.
    const { OAuth2Client } = await import('google-auth-library');
    const client = new OAuth2Client();

    let payload: any;
    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: this.googleAudiences(),
      });
      payload = ticket.getPayload();
    } catch {
      throw new HttpException("Google token yaroqsiz", 401);
    }

    if (!payload) throw new HttpException("Google token yaroqsiz", 401);
    if (payload.email_verified === false) {
      throw new HttpException("Google email tasdiqlanmagan", 401);
    }

    const email = payload.email;
    const googleId = payload.sub;
    const firstName = payload.given_name || "";
    const lastName = payload.family_name || "";
    const photo = payload.picture || "";

    if (!email) throw new BadRequestException("Google account has no email");
    if (!googleId) throw new BadRequestException("Google account has no id");

    // Reuse existing googleLogin logic
    return this.googleLogin({ email, id: googleId, firstName, lastName, photo });
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
