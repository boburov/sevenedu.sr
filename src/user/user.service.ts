import { HttpException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UploadsService } from 'src/uploads/uploads.service';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
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

    const user = await this.prisma.user.findUnique({ where: { id } });
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

    // Agar parol yangilanayotgan bo'lsa, uni hash qilamiz
    let hashedPassword = user.password;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        name,
        surname,
        phonenumber,
        email,
        password: hashedPassword,
        profilePic: newProfilePic,
      },
    });

    return {
      msg: 'User updated',
      user: updatedUser,
    };
  }

  async getUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }
  async updateProfilePic(id: string, file: Express.Multer.File) {
    const imageUrl = await this.uploadService.uploadFile(file, 'images');

    return this.prisma.user.update({
      where: { id },
      data: {
        profilePic: imageUrl,
      },
    });
  }

  async deleteProfilePic(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.profilePic) {
      await this.uploadService.deleteFile(user.profilePic); // Agar sizda deletePublicFile method mavjud bo‘lsa
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        profilePic: "",
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        courses: true,
        coins: true,
        email: true,
        phonenumber: true,
        profilePic: true,
        code: true,
      },
    });
  }

  async deleteUser(id: string) {
    await this.prisma.user.delete({ where: { id } });
    return { msg: 'Deleted' };
  }
}
