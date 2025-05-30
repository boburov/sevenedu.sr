import { HttpException, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-auth.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private jwt: JwtService, private prisma: PrismaService) { }

  async createUser(createUserDto: CreateUserDto) {
    const { name, surname, phonenumber, smsCode } = createUserDto

    const user = await this.prisma.user.findFirst({ where: { phonenumber } })

    if (user) throw new HttpException(`Phone Number ALready Exist`, 500)

    const SMS_Code = String(Math.floor(Math.random() * 999999999))

    const newUser = await this.prisma.user.create({
      data: {
        name: name,
        surname: surname,
        profilePic: "",
        phonenumber: phonenumber,
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
}
