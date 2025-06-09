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
    return await this.prisma.user.findMany({
      include: {
        notifications: {
          include: {
            notification: true
          }
        }
      }
    });
  }

  async updateUser(
    id: string,
    updateUser: UpdateUserDto,
  ) {
    if (!updateUser) {
      throw new HttpException('Body kiritilmagan', 400);
    }

    const { name, surname, phonenumber, email, password } = updateUser;

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new HttpException('User Not Found', 404);
    }

    if (email && email !== user.email) {
      const existingEmail = await this.prisma.user.findFirst({
        where: { email },
      });

      if (existingEmail) {
        throw new HttpException(`Bu email allaqachon ishlatilmoqda`, 400);
      }
    }


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
      },
    });

    return {
      msg: 'User yangilandi',
      user: updatedUser,
    };
  }

  async getUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        notifications: {
          include: {
            notification: true,
          },
        },
      },
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

  async getLessonStats(userId: string) {
    const totalLessons = await this.prisma.lessons.count();
    const completedLessons = await this.prisma.lessonActivity.count({
      where: { userId },
    });

    return {
      totalLessons,
      completedLessons,
      completionRate: Number(((completedLessons / totalLessons) * 100).toFixed(2)),
    };
  }

  async getVocabularyStats(userId: string) {
    const totalWords = await this.prisma.dictonary.count();
    const learnedWords = await this.prisma.vocabularyProgress.count({
      where: { userId },
    });

    return {
      totalWords,
      learnedWords,
      progressRate: Number(((learnedWords / totalWords) * 100).toFixed(2)),
    };
  }

  async getQuizStats(userId: string) {
    const allQuizzes = await this.prisma.quizs.findMany();
    const userProgress = await this.prisma.quizProgress.findMany({
      where: { userId },
    });

    const total = allQuizzes.length;
    const attempted = userProgress.length;
    const correct = userProgress.filter(p => p.passed).length;

    return {
      total,
      attempted,
      passed: correct,
      passRate: Number(((correct / total) * 100).toFixed(2)),
    };
  }

  
}