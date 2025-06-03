import { HttpException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UploadsService } from 'src/uploads/uploads.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private uploadService: UploadsService,
  ) { }

  async allUser() {
    return await this.prisma.user.findMany({});
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

  async getUserIdFromToken(token: string) {
    try {
      const pureToken = token.replace(/^Bearer\s/, '');
      const decoded = this.jwt.verify(pureToken, { secret: process.env.JWT_SECRET });
      return decoded;
    } catch (error) {
      throw new HttpException('Yaroqsiz token', 401);
    }
  }

  async deleteUser(id: string) {
    await this.prisma.user.delete({ where: { id } });
    return { msg: 'Deleted' };
  }
}
