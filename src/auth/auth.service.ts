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
import { ConfigService } from '@nestjs/config';


@Injectable()
export class AuthService {
  constructor(
    private mailService: MailService,
    private jwt: JwtService,
    private uploadService: UploadsService,
    private prisma: PrismaService,
    private configService: ConfigService,
  ) { }

  generateAlphanumericId(length = 6): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  generateRandomCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase(); // masalan: "K1X3ZP"
  }

  async register(dto: CreateUserDto) {
    const { email, password, name, surname, phonenumber } = dto;

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) throw new HttpException("Bu email allaqachon ro'yxatdan o'tgan", 400);

    const code = this.generateRandomCode();
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.upsert({
      where: { email },
      update: { name, surname, phonenumber, email, code, password: hashedPassword },
      create: { name, surname, phonenumber, email, code, password: hashedPassword }
    });

    await this.mailService.sendVerificationCode(email, code);

    const token = await this.jwt.sign({ id: user.id })

    return { message: "Tasdiqlash kodi emailga yuborildi", token };
  }

  async verify(verifyCode: VerifyCodeDto) {
    const { code, email } = verifyCode
    const find = await this.prisma.user.findFirst({ where: { email } })
    if (!find) throw new HttpException(`Email not Found`, 404)

    const check = await find.code === code
    if (!check) return { msg: "wrong code" }

    const token = await this.jwt.sign({ id: find.id })

    return {
      msg: "userCreated",
      token
    }
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

  async deleteAllUsers(): Promise<void> {
    await this.prisma.user.deleteMany();
  }

 

}
