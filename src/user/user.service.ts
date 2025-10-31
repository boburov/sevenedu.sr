import {
  ForbiddenException,
  HttpException,
  Injectable,
  Logger,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UploadsService } from 'src/uploads/uploads.service';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';
import { eachDayOfInterval, subDays } from 'date-fns';
import { format } from 'date-fns';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  private openai: OpenAI;
  constructor(
    private prisma: PrismaService,
    private uploadService: UploadsService,
    private config: ConfigService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.config.getOrThrow('OPENAI_API_KEY'),
    });
  }

  // Har kuni tungi 2:00 da ishlaydi
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleMonthlySubscriptionExpiry() {
    this.logger.log('Monthly subscription tekshiruvi boshlandi...');

    try {
      const expiredSubscriptions = await this.prisma.userCourse.findMany({
        where: {
          subscription: 'MONTHLY',
          joinedAt: {
            // 30 kundan oldin qo'shilgan kurslar
            lte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          course: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      if (expiredSubscriptions.length === 0) {
        this.logger.log('Muddati tugagan monthly subscription lar topilmadi');
        return;
      }

      this.logger.log(
        `${expiredSubscriptions.length} ta expired subscription topildi`,
      );

      // Kurslarni o'chirish
      const deleteResult = await this.prisma.userCourse.deleteMany({
        where: {
          id: {
            in: expiredSubscriptions.map((sub) => sub.id),
          },
        },
      });

      this.logger.log(
        `${deleteResult.count} ta monthly subscription o'chirildi`,
      );

      // Foydalanuvchilarga notification yuborish (ixtiyoriy)
      await this.sendExpiryNotifications(expiredSubscriptions);
    } catch (error) {
      this.logger.error('Monthly subscription tekshiruvida xatolik:', error);
    }
  }

  private async sendExpiryNotifications(expiredSubscriptions: any[]) {
    try {
      // Har bir foydalanuvchi uchun notification yaratish
      for (const subscription of expiredSubscriptions) {
        await this.prisma.notification.create({
          data: {
            title: 'Kurs muddati tugadi',
            message: `"${subscription.course.title}" kursi uchun sizning monthly subscription muddati tugadi. Kurs qayta aktivlashtirilishi kerak.`,
            isGlobal: false,
            recipients: {
              create: {
                userId: subscription.user.id,
              },
            },
          },
        });
      }

      this.logger.log(
        `${expiredSubscriptions.length} ta notification yuborildi`,
      );
    } catch (error) {
      this.logger.error('Notification yuborishda xatolik:', error);
    }
  }

  // Har yakshanba kuni tungi 3:00 da ishlaydi (haftalik tekshiruv)
  @Cron(CronExpression.EVERY_WEEK)
  async weeklySubscriptionCheck() {
    this.logger.log('Haftalik subscription tekshiruvi boshlandi...');

    // Qo'shimcha tekshiruvlar uchun
    const upcomingExpiries = await this.prisma.userCourse.findMany({
      where: {
        subscription: 'MONTHLY',
        joinedAt: {
          // 25-29 kun oralig'ida qo'shilgan kurslar (tekshiruvdan 5 kun oldin)
          lte: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
          gte: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        course: {
          select: {
            title: true,
          },
        },
      },
    });

    if (upcomingExpiries.length > 0) {
      // Muddati yaqinlashayotgan foydalanuvchilarga ogohlantirish
      for (const subscription of upcomingExpiries) {
        await this.prisma.notification.create({
          data: {
            title: 'Kurs muddati yaqinlashmoqda',
            message: `"${subscription.course.title}" kursi uchun sizning monthly subscription muddati 5 kundan keyin tugaydi.`,
            isGlobal: false,
            recipients: {
              create: {
                userId: subscription.user.id,
              },
            },
          },
        });
      }

      this.logger.log(`${upcomingExpiries.length} ta ogohlantirish yuborildi`);
    }
  }

  async deleteUser(id: string) {
    try {
      // XATO: where: { id: { id: id } } - NOTO'G'RI
      // TO'G'RI: where: { id: id }
      const user = await this.prisma.user.findFirst({ where: { id } });

      if (!user) throw new HttpException('User not found', 404);

      await this.prisma.user.delete({ where: { id } });

      return {
        msg: 'User ochirildi',
      };
    } catch (error) {
      console.log(error);
      // Xatoni qaytarish kerak
      throw new InternalServerErrorException("User ni o'chirishda xatolik");
    }
  }
  async assignCourseToUser(
    email: string,
    courseId: string,
    subscription: 'FULL_CHARGE' | 'MONTHLY',
  ) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    const course = await this.prisma.coursesCategory.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Kurs topilmadi');
    }

    const existing = await this.prisma.userCourse.findFirst({
      where: { userId: user.id, courseId },
    });

    if (existing) {
      return { message: 'Bu kurs allaqachon foydalanuvchiga biriktirilgan' };
    }

    const newCourse = await this.prisma.userCourse.create({
      data: {
        userId: user.id,
        courseId,
        subscription,
      },
    });

    return {
      message: `Kurs foydalanuvchiga qo‘shildi: ${subscription}`,
      data: newCourse,
    };
  }

  async createUser(data: {
    name?: string;
    surname?: string;
    email: string;
    password: string;
    phonenumber?: string;
  }) {
    // Email borligini tekshiramiz
    const existingUser = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingUser) {
      throw new HttpException('Bu email allaqachon ishlatilgan', 400);
    }

    // Parolni hash qilamiz
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Foydalanuvchini yaratamiz
    const newUser = await this.prisma.user.create({
      data: {
        name: data.name || '',
        surname: data.surname || '',
        email: data.email,
        isVerified: true, // email tekshiruvi yo‘q, shunchaki true qilamiz
        password: hashedPassword,
        phonenumber: data.phonenumber || '',
        code: '', // email tekshiruvi yo‘q, shunchaki bo‘sh qoldiramiz
      },
    });

    // Parolsiz userni qaytaramiz
    const { password, ...userWithoutPassword } = newUser;
    return {
      message: 'Foydalanuvchi yaratildi',
      user: userWithoutPassword,
    };
  }

  async fix_user() {
    const usersWithCourses = await this.prisma.user.findMany({
      where: {
        courses: {
          some: {},
        },
      },
      select: { id: true },
    });

    if (usersWithCourses.length === 0) {
      console.log('Hech bir userda kurs yo‘q.');
      return;
    }

    const userIds = usersWithCourses.map((u) => u.id);

    const update = await this.prisma.userCourse.updateMany({
      where: {
        userId: {
          in: userIds,
        },
      },
      data: {
        subscription: 'FULL_CHARGE',
      },
    });

    console.log(`✅ ${update.count} ta yozuv yangilandi.`);
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
      const existingEmail = await this.prisma.user.findFirst({
        where: { email },
      });
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
            lesson: true,
          },
        },
        courses: true,
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
        courses: {
          include: {
            course: true,
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

  async getLessonStats(userId: string) {
    const totalLessons = await this.prisma.lessons.count();
    const completedLessons = await this.prisma.lessonActivity.count({
      where: { userId },
    });
    return {
      totalLessons,
      completedLessons,
      completionRate: Number(
        ((completedLessons / totalLessons) * 100).toFixed(2),
      ),
    };
  }

  async chatWithAI(
    userId: string,
    lessonId: string,
    message: string,
  ): Promise<string> {
    try {
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
      } else if (usage.count >= 7) {
        throw new ForbiddenException(
          'Siz bugungi 7 ta kreditdan foydalandingiz.',
        );
      } else {
        await this.prisma.lessonAIUsage.update({
          where: { id: usage.id },
          data: { count: { increment: 1 } },
        });
      }

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content:
              'Siz foydalanuvchiga til o‘rgatadigan ustozsiz. Har savolga aniq, qisqa, o‘zbek tilida javob bering. Dars mavzusidan chiqmay javob bering.',
          },
          { role: 'user', content: message },
        ],
      });

      return completion.choices[0].message?.content ?? 'Javob topilmadi.';
    } catch (error) {
      console.error('GPT chat xatosi:', error);

      if (error instanceof ForbiddenException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'AI javobi olinmadi. Iltimos, keyinroq qayta urinib ko‘ring.',
      );
    }
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
        (a) => format(a.watchedAt, 'yyyy-MM-dd') === dateKey,
      );

      const vocabularyCorrect = filtered.reduce(
        (sum, item) => sum + (item.vocabularyCorrect || 0),
        0,
      );
      const vocabularyWrong = filtered.reduce(
        (sum, item) => sum + (item.vocabularyWrong || 0),
        0,
      );

      const quizCorrect = filtered.reduce(
        (sum, item) => sum + (item.quizCorrect || 0),
        0,
      );
      const quizWrong = filtered.reduce(
        (sum, item) => sum + (item.quizWrong || 0),
        0,
      );

      const testTotal = filtered.filter(
        (item) => item.score !== null && item.score !== undefined,
      ).length;
      const testCorrect = filtered.reduce(
        (sum, item) => sum + (item.score || 0),
        0,
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
          total: testTotal * 100,
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

  async getCertificate(userId: string, courseId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        surname: true,
        email: true,
        profilePic: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    const course = await this.prisma.userCourse.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Kurs topilmadi');
    }

    const updateCourse = await this.prisma.userCourse.update({
      where: { id: courseId },
      data: { isFinished: true },
    });
  }

  async markLessonAsSeen(userId: string, lessonId: string) {
    const existing = await this.prisma.lessonActivity.findFirst({
      where: {
        userId,
        lessonsId: lessonId,
      },
    });

    if (existing) {
      return { message: 'Bu dars allaqachon ko‘rilgan' };
    }

    await this.prisma.lessonActivity.create({
      data: {
        userId,
        lessonsId: lessonId,
        watchedAt: new Date(),
      },
    });

    return { message: 'Dars ko‘rilgan deb belgilandi' };
  }

  async addCoins(userId: string, coins: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { coins: true },
    });
    console.log('💰 Tanga so‘rovi:', userId, coins);

    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { coins: user.coins + coins },
    });

    return {
      message: 'Coins qo‘shildi',
      coins: updatedUser.coins,
    };
  }
}
