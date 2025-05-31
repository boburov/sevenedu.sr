import { HttpException, Injectable, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-auth.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt'
import { MailService } from 'src/mail/mail.service';
import { VerifyCodeDto } from './dto/verify-code';
import { LoginUserDto } from './dto/login-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private mailService: MailService,
    private jwt: JwtService,
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

  async createUser(createUserDto: CreateUserDto) {
    const { name, surname, email, phonenumber, password } = createUserDto

    const exists = await this.prisma.user.findFirst({ where: { email } });
    if (exists) throw new HttpException("Bu email ro‘yxatdan o‘tgan", 400);

    const code = await this.generateAlphanumericId(6)

    this.mailService.sendVerificationCode(email, code)

    const hash = await bcrypt.hash(password, 10)
    const newUser = await this.prisma.user.create({
      data: {
        name: name,
        surname: surname,
        profilePic: "",
        email: email,
        phonenumber: phonenumber,
        password: hash,
      }
    })

    const payload = { username: newUser.name, code, sub: newUser.id };

    const token = await this.jwt.sign(payload)

    return {
      msg: "User succesfull created !",
      token,
      newUser
    }
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
