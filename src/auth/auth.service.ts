import { HttpException, Injectable, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-auth.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt'
import { MailService } from 'src/mail/mail.service';
import { VerifyCodeDto } from './dto/verify-code';
import { LoginUserDto } from './dto/login-user.dto';
import { UpdateUserDto } from 'src/user/dto/update-user.dto';
import { UploadsService } from 'src/uploads/uploads.service';
import { Cron, CronExpression } from '@nestjs/schedule'

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

  @Cron(CronExpression.EVERY_10_MINUTES)
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
        codeExpiresAt: expiresAt,
        password: hashedPassword,
        isVerified: false,
      },
    });

    await this.mailService.sendVerificationCode(email, code);

    return { message: "Tasdiqlash kodi emailga yuborildi" };
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

    const token = await this.jwt.sign({ id: user.id });
    return { msg: "User verified", token };
  }

  async updateUser(
    id: string,
    updateUser: UpdateUserDto,
    file: Express.Multer.File,
    type: string,
  ) {
    if (!updateUser) {
      throw new HttpException('Body kiritilmagan', 400);
    }

    const { name, surname, phonenumber, email, password } = updateUser;

    const user = await this.prisma.user.findFirst({ where: { id } });
    if (!user) {
      throw new HttpException('User Not Found', 404);
    }

    const findEmail = await this.prisma.user.findFirst({
      where: { email, NOT: { id } },
    });

    if (findEmail) {
      throw new HttpException(`You can't use this email`, 400);
    }

    let newProfilePic = user.profilePic;

    if (file) {
      const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

      if (!allowedImageTypes.includes(file.mimetype)) {
        throw new HttpException('Only images: jpg, jpeg, png, webp', 400);
      }

      if (user.profilePic) {
        await this.uploadService.deleteFile(user.profilePic);
      }

      newProfilePic = await this.uploadService.uploadFile(file, 'images');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        name,
        surname,
        phonenumber,
        email,
        password,
        profilePic: newProfilePic,
      },
    });

    return {
      msg: 'User updated',
      user: updatedUser,
    };
  }

  async login(LoginUserDto: LoginUserDto) {
    const { name, phonenumber, email, password } = LoginUserDto


    const user = await this.prisma.user.findUnique({
      where: { email, name, phonenumber, },
    });

    if (!user?.isVerified) {
      throw new UnauthorizedException('Please verify your account first');
    }

    if (!user) {
      throw new UnauthorizedException('Foydalanuvchi topilmadi');
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      throw new UnauthorizedException('Noto‘g‘ri parol');
    }

    const payload = { sub: user.id, email: user.email };
    const token = await this.jwt.signAsync(payload);

    return {
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
      },
    };

  }

  async deleteAllUsers() {
    await this.prisma.user.deleteMany();
  }



}
