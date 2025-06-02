import { HttpException, Injectable, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-auth.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt'
import { MailService } from 'src/mail/mail.service';
import { VerifyCodeDto } from './dto/verify-code';
import { LoginUserDto } from './dto/login-user.dto';
import { createUserByEmail } from './dto/create-by-email.dto';
import { UpdateUserDto } from 'src/user/dto/update-user.dto';
import { UploadsService } from 'src/uploads/uploads.service';

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

  async verifyCode(verifyCode: VerifyCodeDto,) {
    try {
      const decoded = this.jwt.verify(verifyCode.token);

      if (decoded.code !== verifyCode.code) {
        throw new HttpException('Kod noto‘g‘ri', 400);
      }

      return { msg: 'Email tasdiqlandi' };
    } catch (error) {
      throw new HttpException('Kod noto‘g‘ri yoki muddati tugagan', 400);
    }
  }

  async createUserByEmail(createUserByEmail: createUserByEmail) {
    const { email, password } = createUserByEmail
    const exists = await this.prisma.user.findFirst({ where: { email } });
    if (exists) throw new HttpException("Bu email ro‘yxatdan o‘tgan", 400);

    const code = await this.generateAlphanumericId(6)

    this.mailService.sendVerificationCode(email, code)

    const hash = await bcrypt.hash(password, 10)
    const newUser = await this.prisma.user.create({
      data: {
        phonenumber: "",
        name: "",
        surname: "",
        profilePic: "",
        email,
        password: hash,
      }
    })

    const payload = { username: newUser.id, code, sub: newUser.id };

    const token = await this.jwt.sign(payload)

    return {
      msg: "User succesfull created !",
      token,
      newUser
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

}
