import { HttpException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) { }

  async allUser() {
    const user = this.prisma.user.findMany({})
    return user
  }

  async updateUser(id: string, updateUser: UpdateUserDto) {
    if (!updateUser) throw new HttpException('Body kiritilmagan', 400);

    const { name, surname, phonenumber, email, password, profilePic } = updateUser;

    const user = await this.prisma.user.findFirst({ where: { id } });
    if (!user) throw new HttpException(`User Not Found`, 404);

    const findEmail = await this.prisma.user.findFirst({
      where: { email, NOT: { id } }, // Email boshqa foydalanuvchiga tegishlimi?
    });
    if (findEmail) throw new HttpException(`You can't use this email`, 400);

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        name,
        surname,
        phonenumber,
        email,
        profilePic,
        password,
      },
    });

    return {
      msg: 'User updated',
      user: updated,
    };
  }

  async deleteUser(id) {
    await this.prisma.user.delete({ where: { id } })
    return { msg: "deleted" }
  }

}
