import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  HttpException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UploadsService } from 'src/uploads/uploads.service';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';
import { eachDayOfInterval, subDays, format } from 'date-fns';

@Injectable()
export class UserService {
  private openai: OpenAI;
  constructor(
    private prisma: PrismaService,
    private uploadService: UploadsService,
    private config: ConfigService,
  ) {
    this.openai = new OpenAI({ apiKey: this.config.getOrThrow('OPENAI_API_KEY') });
  }

  checkEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email }, select: { id: true } });
  }

  async allUser() {
    return this.prisma.user.findMany({
      select: {
        certificate: true,
        lastLoginAt: true,
        showedLesson: { include: { lesson: true } },
        notifications: { include: { notification: true } },
      },
    });
  }

  getUserByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });
  }

  getUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        notifications: { include: { notification: true } },
      },
    });
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new HttpException('Foydalanuvchi topilmadi', 404);

    if (dto.email && dto.email !== user.email) {
      const emailExists = await this.prisma.user.findFirst({ where: { email: dto.email } });
      if (emailExists) throw new HttpException('Email band', 400);
    }

    if (dto.password) dto.password = await bcrypt.hash(dto.password, 10);

    const updated = await this.prisma.user.update({ where: { id }, data: dto });
    const { password, ...userWithoutPassword } = updated;
    return { msg: 'User yangilandi', user: userWithoutPassword };
  }

  updateProfilePic(id: string, file: Express.Multer.File) {
    return this.uploadService.uploadFile(file, 'images').then((url) =>
      this.prisma.user.update({ where: { id }, data: { profilePic: url } })
    );
  }

  async deleteProfilePic(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (user.profilePic) await this.uploadService.deleteFile(user.profilePic);
    return this.prisma.user.update({ where: { id }, data: { profilePic: '' } });
  }

  async assignCourse(email: string, courseId: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    const exists = await this.prisma.userCourse.findFirst({
      where: { userId: user.id, courseId },
    });
    if (exists) return { message: 'Kurs allaqachon mavjud' };

    await this.prisma.userCourse.create({ data: { userId: user.id, courseId } });
    return { message: 'Kurs qo‘shildi' };
  }

  addCoins(userId: string, coins: number) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { coins: { increment: coins } },
      select: { coins: true },
    }).then(res => ({ message: 'Coins qo‘shildi', coins: res.coins }));
  }

  async getUserProgress(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { showedLesson: true },
    });

    const init = { vocabC: 0, vocabW: 0, quizC: 0, quizW: 0, tests: 0 };
    user?.showedLesson.forEach((l) => {
      init.vocabC += l.vocabularyCorrect;
      init.vocabW += l.vocabularyWrong;
      init.quizC += l.quizCorrect;
      init.quizW += l.quizWrong;
      init.tests += 1;
    });

    return {
      vocabulary: { correct: init.vocabC, total: init.vocabC + init.vocabW },
      quiz: { correct: init.quizC, total: init.quizC + init.quizW },
      test: { correct: 0, total: init.tests * 100 },
    };
  }

  async getDailyStats(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } });
    if (!user) throw new NotFoundException('User not found');

    const today = new Date();
    const start = user.createdAt || subDays(today, 30);
    const days = eachDayOfInterval({ start, end: today });

    const activity = await this.prisma.lessonActivity.findMany({
      where: { userId, watchedAt: { gte: start, lte: today } },
    });

    return days.map((day) => {
      const key = format(day, 'yyyy-MM-dd');
      const daily = activity.filter((a) => format(a.watchedAt, 'yyyy-MM-dd') === key);
      const [vocabC, vocabW, quizC, quizW, testS] = daily.reduce(
        (acc, item) => [
          acc[0] + (item.vocabularyCorrect || 0),
          acc[1] + (item.vocabularyWrong || 0),
          acc[2] + (item.quizCorrect || 0),
          acc[3] + (item.quizWrong || 0),
          acc[4] + (item.score || 0),
        ],
        [0, 0, 0, 0, 0],
      );
      const testCount = daily.filter((d) => d.score !== null).length;

      return {
        date: key,
        vocabulary: { correct: vocabC, total: vocabC + vocabW },
        quiz: { correct: quizC, total: quizC + quizW },
        test: { correct: testS, total: testCount * 100 },
      };
    });
  }

  async getStatsByRange(userId: string, range: 'daily' | 'monthly') {
    const today = new Date();
    const start = subDays(today, range === 'daily' ? 30 : 365);

    const data = await this.prisma.lessonActivity.findMany({
      where: { userId, watchedAt: { gte: start, lte: today } },
    });

    const grouped = {};
    for (const entry of data) {
      const key = format(entry.watchedAt, range === 'daily' ? 'yyyy-MM-dd' : 'yyyy-MM');
      grouped[key] ??= { vocabC: 0, vocabW: 0, quizC: 0, quizW: 0, testS: 0, testC: 0 };

      grouped[key].vocabC += entry.vocabularyCorrect;
      grouped[key].vocabW += entry.vocabularyWrong;
      grouped[key].quizC += entry.quizCorrect;
      grouped[key].quizW += entry.quizWrong;
      if (entry.score != null) {
        grouped[key].testS += entry.score;
        grouped[key].testC += 1;
      }
    }

    return Object.entries(grouped).map(([date, d]: any) => ({
      date,
      vocabulary: { correct: d.vocabC, total: d.vocabC + d.vocabW },
      quiz: { correct: d.quizC, total: d.quizC + d.quizW },
      test: { correct: d.testS, total: d.testC * 100 },
    }));
  }

  async getLessonDetailsPerUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { showedLesson: { include: { lesson: true } } },
    });
    if (!user) throw new NotFoundException('User not found');

    return user.showedLesson.map((s) => ({
      lessonId: s.lesson.id,
      title: s.lesson.title,
      watchedAt: s.watchedAt,
      vocabulary: {
        correct: s.vocabularyCorrect,
        wrong: s.vocabularyWrong,
        total: s.vocabularyCorrect + s.vocabularyWrong,
      },
      quiz: {
        correct: s.quizCorrect,
        wrong: s.quizWrong,
        total: s.quizCorrect + s.quizWrong,
      },
      test: { score: s.score ?? 0, total: 100 },
    }));
  }

  async chatWithAI(userId: string, lessonId: string, message: string) {
    const today = new Date();
    const start = new Date(today.setHours(0, 0, 0, 0));
    const usage = await this.prisma.lessonAIUsage.findFirst({
      where: { userId, lessonId, date: { gte: start } },
    });

    if (!usage)
      await this.prisma.lessonAIUsage.create({ data: { userId, lessonId, date: new Date(), count: 1 } });
    else if (usage.count >= 10)
      throw new ForbiddenException('Bugungi limit tugagan');
    else
      await this.prisma.lessonAIUsage.update({ where: { id: usage.id }, data: { count: { increment: 1 } } });

    const res = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'Siz til o‘rgatadigan ustozsiz. Javoblar qisqa va o‘zbek tilida bo‘lsin.' },
        { role: 'user', content: message },
      ],
    });

    return { answer: res.choices[0].message?.content || 'Javob topilmadi' };
  }

  async getAIUsage(userId: string, lessonId: string) {
    const today = new Date();
    const start = new Date(today.setHours(0, 0, 0, 0));
    const usage = await this.prisma.lessonAIUsage.findFirst({
      where: { userId, lessonId, date: { gte: start } },
    });
    return { count: usage?.count || 0 };
  }

  async getCertificate(userId: string, courseId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, surname: true, email: true, profilePic: true },
    });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    const course = await this.prisma.userCourse.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Kurs topilmadi');

    await this.prisma.userCourse.update({ where: { id: courseId }, data: { isFinished: true } });
  }

  async markLessonAsSeen(userId: string, lessonId: string) {
    const existing = await this.prisma.lessonActivity.findFirst({
      where: { userId, lessonsId: lessonId },
    });
    if (existing) return { message: 'Oldin ko‘rilgan' };

    await this.prisma.lessonActivity.create({
      data: { userId, lessonsId: lessonId, watchedAt: new Date() },
    });
    return { message: 'Dars ko‘rilgan deb belgilandi' };
  }

  deleteUser() {
    return this.prisma.user.deleteMany().then(() => ({ msg: 'Deleted' }));
  }
}
