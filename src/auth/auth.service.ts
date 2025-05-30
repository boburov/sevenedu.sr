import { HttpException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-auth.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt'
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class AuthService {
  constructor(private mailService: MailService, private jwt: JwtService, private prisma: PrismaService) { }

  generateAlphanumericId(length = 6): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }


  async createUser(createUserDto: CreateUserDto) {
    const { name, surname, email, phonenumber, password } = createUserDto

    const check = await this.prisma.user.findFirst({ where: { email } })

    if (check) throw new HttpException(`Email ALready Exist`, 500)

    const user = await this.prisma.user.findFirst({ where: { phonenumber } })

    if (user) throw new HttpException(`Phone Number ALready Exist`, 500)

    const SMS_Code = this.generateAlphanumericId(6)

    await this.mailService.sendVerificationCode(email, SMS_Code);

    const hash = await bcrypt.hash(password, 10)

    const newUser = await this.prisma.user.create({
      data: {
        name: name,
        surname: surname,
        profilePic: "",
        email: email,
        phonenumber: phonenumber,
        password: hash,
        smsCode: SMS_Code,
      }
    })

    const payload = { username: newUser.name, sub: newUser.id };

    const token = await this.jwt.sign(payload)

    return {
      msg: "User succesfull created !",
      token,
      newUser
    }
  }

  async allUser() {
    const user = this.prisma.user.findMany({})
    return user
  }

  async deleteUser(id) {
    await this.prisma.user.delete({ where: { id } })
    return { msg: "deleted" }
  }

}
