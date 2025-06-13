import { HttpException, Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ActivityService {
  constructor(private prisma: PrismaService) { }

  async getUserDailyActivity(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const activities = await this.prisma.lessonActivity.findMany({
      where: {
        userId,
        watchedAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      select: {
        lessonsId: true,
        vocabularyCorrect: true,
        vocabularyWrong: true,
        quizCorrect: true,
        quizWrong: true,
        score: true,
        watchedAt: true,
      },
    });

    return {
      date: today.toISOString().split('T')[0],
      totalLessons: activities.length,
      totalVocabularyCorrect: activities.reduce((sum, act) => sum + (act.vocabularyCorrect || 0), 0),
      totalVocabularyWrong: activities.reduce((sum, act) => sum + (act.vocabularyWrong || 0), 0),
      totalQuizCorrect: activities.reduce((sum, act) => sum + (act.quizCorrect || 0), 0),
      totalQuizWrong: activities.reduce((sum, act) => sum + (act.quizWrong || 0), 0),
      averageScore: activities.length
        ? Math.round(activities.reduce((sum, act) => sum + (act.score || 0), 0) / activities.length)
        : 0,
      lessons: activities,
    };
  }


  async showedLessons(dto: { userId: string; lessonId: string, }) {
    const { userId, lessonId } = dto;
    const score = 87;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new HttpException('Foydalanuvchi topilmadi', 404);

    const lesson = await this.prisma.lessons.findUnique({
      where: { id: lessonId },
      select: { coursesCategoryId: true },
    });
    if (!lesson) throw new HttpException('Dars topilmadi', 404);

    const already = await this.prisma.lessonActivity.findUnique({
      where: {
        userId_lessonsId: {
          userId,
          lessonsId: lessonId,
        },
      },
    });
    if (already) {
      return { msg: "Bu dars allaqachon ko‘rilgan" };
    }

    await this.prisma.$transaction([
      this.prisma.lessonActivity.create({
        data: {
          userId,
          lessonsId: lessonId,
          watchedAt: new Date(),
          score: score,
          courseId: lesson.coursesCategoryId,
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          coins: { increment: score },
        },
      }),
    ]);

    return { msg: 'Activity qo‘shildi va score qo‘shildi' };
  }

  async updateLessonActivityStats(dto: {
    userId: string,
    lessonsId: string,
    vocabularyCorrect?: number,
    vocabularyWrong?: number,
    quizCorrect?: number,
    quizWrong?: number,
    score?: number
  }) {
    const {
      userId,
      lessonsId,
      vocabularyCorrect,
      vocabularyWrong,
      quizCorrect,
      quizWrong,
      score
    } = dto;

    await this.prisma.lessonActivity.update({
      where: {
        userId_lessonsId: {
          userId,
          lessonsId
        }
      },
      data: {
        vocabularyCorrect: { increment: vocabularyCorrect },
        vocabularyWrong: { increment: vocabularyWrong },
        quizCorrect: { increment: quizCorrect },
        quizWrong: { increment: quizWrong },
        score: score,
      }
    });

    return { msg: "updated successfully" };
  }


}