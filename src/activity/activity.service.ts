import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { startOfDay } from 'date-fns';

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  private getToday(): Date {
    return startOfDay(new Date());
  }

  async markLessonViewed(userId: string) {
    const today = this.getToday();

    return this.prisma.activity.upsert({
      where: { userId_date: { userId, date: today } },
      update: { watchedLesson: true },
      create: {
        userId,
        date: today,
        watchedLesson: true,
      },
    });
  }

  async addVocabularyProgress(userId: string, count: number) {
    const today = this.getToday();

    return this.prisma.activity.upsert({
      where: { userId_date: { userId, date: today } },
      update: {
        vocabularyLearned: { increment: count },
      },
      create: {
        userId,
        date: today,
        vocabularyLearned: count,
      },
    });
  }

  async recordTestScore(userId: string, score: number) {
    const today = this.getToday();

    return this.prisma.activity.upsert({
      where: { userId_date: { userId, date: today } },
      update: { testScore: score },
      create: {
        userId,
        date: today,
        testScore: score,
      },
    });
  }

  async recordVocabularyTestScore(userId: string, score: number) {
    const today = this.getToday();

    return this.prisma.activity.upsert({
      where: { userId_date: { userId, date: today } },
      update: { vocabTestScore: score },
      create: {
        userId,
        date: today,
        vocabTestScore: score,
      },
    });
  }

  async getTodayActivity(userId: string) {
    const today = this.getToday();

    const activity = await this.prisma.activity.findUnique({
      where: { userId_date: { userId, date: today } },
    });

    return (
      activity || {
        watchedLesson: false,
        vocabularyLearned: 0,
        testScore: 0,
        vocabTestScore: 0,
      }
    );
  }
}
