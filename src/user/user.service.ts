import { ForbiddenException, HttpException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UploadsService } from 'src/uploads/uploads.service';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';
import { eachDayOfInterval, subDays } from 'date-fns';
import { format } from 'date-fns';


@Injectable()
export class UserService {
  private openai: OpenAI;
  constructor(
    private prisma: PrismaService,
    private uploadService: UploadsService,
    private config: ConfigService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.config.getOrThrow('OPENAI_API_KEY')
    });
  }

  async updateUser(id: string, updateUser: UpdateUserDto) {
    if (!updateUser) {
      throw new HttpException('Body kiritilmagan', 400);
    }

    const { name, surname, phonenumber, email, password } = updateUser;

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new HttpException('Foydalanuvchi topilmadi', 404);
    }

    if (email && email !== user.email) {
      const existingEmail = await this.prisma.user.findFirst({ where: { email } });
      if (existingEmail) {
        throw new HttpException('Bu email allaqachon ishlatilmoqda', 400);
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

    const { password: _password, ...userWithoutPassword } = updatedUser;
    return {
      msg: 'User yangilandi',
      user: userWithoutPassword,
    };
  }

  async allUser() {
    return await this.prisma.user.findMany({
      include: {
        showedLesson: {
          include: {
            lesson: true
          }
        },
        notifications: {
          include: {
            notification: true,
          },
        },
      },
    });
  }

  async assignCourse(email: string, courseId: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    const exists = await this.prisma.userCourse.findFirst({
      where: {
        userId: user.id,
        courseId,
      },
    });

    if (exists) {
      return { message: 'Bu kurs allaqachon foydalanuvchida mavjud' };
    }

    await this.prisma.userCourse.create({
      data: {
        userId: user.id,
        courseId,
      },
    });

    return { message: 'Kurs foydalanuvchiga qo‘shildi' };
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
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new Error('User not found');
    }

    if (user.profilePic) {
      await this.uploadService.deleteFile(user.profilePic);
    }

    return this.prisma.user.update({
      where: { id },
      data: { profilePic: '' },
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

  async deleteUser() {
    await this.prisma.user.deleteMany();
    return { msg: 'Deleted' };
  }

  async getLessonStats(userId: string) {
    const totalLessons = await this.prisma.lessons.count();
    const completedLessons = await this.prisma.lessonActivity.count({ where: { userId } });
    return {
      totalLessons,
      completedLessons,
      completionRate: Number(((completedLessons / totalLessons) * 100).toFixed(2)),
    };
  }

  async chatWithAI(userId: string, lessonId: string, message: string): Promise<string> {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));

    let usage = await this.prisma.lessonAIUsage.findFirst({
      where: {
        userId,
        lessonId,
        date: { gte: startOfDay },
      },
    });

    if (!usage) {
      usage = await this.prisma.lessonAIUsage.create({
        data: {
          userId,
          lessonId,
          date: new Date(),
          count: 1,
        },
      });
    } else if (usage.count >= 10) {
      throw new ForbiddenException('Siz bugungi 10 ta kreditdan foydalandingiz.');
    } else {
      await this.prisma.lessonAIUsage.update({
        where: { id: usage.id },
        data: { count: { increment: 1 } },
      });
    }

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `Siz foydalanuvchiga til o‘rgatadigan ustozsiz. Har savolga aniq, qisqa, o‘zbek tilida javob bering. Dars mavzusidan chiqmay javob bering.`,
        },
        {
          role: 'user',
          content: message,
        },
      ],
    });

    return completion.choices[0].message?.content ?? 'Javob topilmadi.';
  }

  async getUserProgress(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { showedLesson: true },
    });

    let vocabularyCorrect = 0;
    let vocabularyWrong = 0;
    let quizCorrect = 0;
    let quizWrong = 0;
    let testScore = 0;
    let testCount = 0;

    user?.showedLesson.forEach((lesson) => {
      vocabularyCorrect += lesson.vocabularyCorrect;
      vocabularyWrong += lesson.vocabularyWrong;
      quizCorrect += lesson.quizCorrect;
      quizWrong += lesson.quizWrong;
      testCount += 1;
    });

    return {
      vocabulary: {
        correct: vocabularyCorrect,
        total: vocabularyCorrect + vocabularyWrong,
      },
      quiz: {
        correct: quizCorrect,
        total: quizCorrect + quizWrong,
      },
      test: {
        correct: testScore,
        total: testCount * 100,
      },
    };
  }

  async getDailyStats(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    });

    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    const today = new Date();
    const startDate = user.createdAt || subDays(today, 30);
    const days = eachDayOfInterval({ start: startDate, end: today });

    const lessonActivities = await this.prisma.lessonActivity.findMany({
      where: {
        userId,
        watchedAt: { gte: startDate, lte: today },
      },
    });

    const dailyStats = days.map((day) => {
      const dateKey = format(day, 'yyyy-MM-dd');

      const filtered = lessonActivities.filter(
        (a) => format(a.watchedAt, 'yyyy-MM-dd') === dateKey
      );

      const vocabularyCorrect = filtered.reduce(
        (sum, item) => sum + (item.vocabularyCorrect || 0),
        0
      );
      const vocabularyWrong = filtered.reduce(
        (sum, item) => sum + (item.vocabularyWrong || 0),
        0
      );

      const quizCorrect = filtered.reduce(
        (sum, item) => sum + (item.quizCorrect || 0),
        0
      );
      const quizWrong = filtered.reduce(
        (sum, item) => sum + (item.quizWrong || 0),
        0
      );

      const testTotal = filtered.filter((item) => item.score !== null && item.score !== undefined).length;
      const testCorrect = filtered.reduce(
        (sum, item) => sum + (item.score || 0),
        0
      );

      return {
        date: dateKey,
        vocabulary: {
          correct: vocabularyCorrect,
          total: vocabularyCorrect + vocabularyWrong,
        },
        quiz: {
          correct: quizCorrect,
          total: quizCorrect + quizWrong,
        },
        test: {
          correct: testCorrect,
          total: testTotal * 100, // agar test 100 ballik bo‘lsa
        },
      };
    });

    return dailyStats;
  }


  async getActivityByUser(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { createdAt: true },
      });

      const activity = await this.prisma.lessonActivity.findMany({
        where: { userId },
        select: {
          watchedAt: true,
          vocabularyCorrect: true,
          vocabularyWrong: true,
        },
      });

      return {
        createdAt: user?.createdAt,
        activity,
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to get user activity');
    }
  }

  async getLessonDetailsPerUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        showedLesson: {
          include: {
            lesson: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    const lessonDetails = user.showedLesson.map((entry) => ({
      lessonId: entry.lesson.id,
      title: entry.lesson.title,
      watchedAt: entry.watchedAt,
      vocabulary: {
        correct: entry.vocabularyCorrect,
        wrong: entry.vocabularyWrong,
        total: entry.vocabularyCorrect + entry.vocabularyWrong,
      },
      quiz: {
        correct: entry.quizCorrect,
        wrong: entry.quizWrong,
        total: entry.quizCorrect + entry.quizWrong,
      },
      test: {
        score: entry.score ?? 0,
        total: 100,
      },
    }));

    return lessonDetails;
  }

}
