import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { format, subDays, eachDayOfInterval } from 'date-fns';

@Injectable()
export class ActivityService {
  constructor(private prisma: PrismaService) { }

  async markLesson(
    userId: string,
    lessonId: string,
    courseId: string,
    data: {
      vocabularyCorrect?: number;
      vocabularyWrong?: number;
      quizCorrect?: number;
      quizWrong?: number;
      score?: number;
    },
  ) {
    const existing = await this.prisma.lessonActivity.upsert({
      where: {
        userId_lessonsId: {
          userId,
          lessonsId: lessonId,
        },
      },
      update: {
        watchedAt: new Date(),
      },
      create: {
        userId,
        lessonsId: lessonId,
        watchedAt: new Date(),
      },
    });


    if (existing) {
      return this.prisma.lessonActivity.update({
        where: { userId_lessonsId: { userId, lessonsId: lessonId } },
        data: {
          courseId,
          vocabularyCorrect: { increment: data.vocabularyCorrect || 0 },
          vocabularyWrong: { increment: data.vocabularyWrong || 0 },
          quizCorrect: { increment: data.quizCorrect || 0 },
          quizWrong: { increment: data.quizWrong || 0 },
          score: data.score ?? existing.score,
          watchedAt: new Date(),
        },
      });
    }

    return this.prisma.lessonActivity.create({
      data: {
        userId,
        lessonsId: lessonId,
        courseId,
        vocabularyCorrect: data.vocabularyCorrect || 0,
        vocabularyWrong: data.vocabularyWrong || 0,
        quizCorrect: data.quizCorrect || 0,
        quizWrong: data.quizWrong || 0,
        score: data.score,
        watchedAt: new Date(),
      },
    });
  }

  async getLessonActivity(userId: string, lessonId: string) {
    return this.prisma.lessonActivity.findUnique({
      where: { userId_lessonsId: { userId, lessonsId: lessonId } },
      include: { lesson: true, course: true },
    });
  }

  async getAllActivityByUser(userId: string) {
    return this.prisma.lessonActivity.findMany({
      where: { userId },
      include: {
        lesson: true,
        course: true,
      },
    });
  }

  async getProgressByCourse(userId: string, courseId: string) {
    const lessons = await this.prisma.lessons.findMany({
      where: { coursesCategoryId: courseId },
    });

    const activities = await this.prisma.lessonActivity.findMany({
      where: { userId, courseId },
    });

    const completed = activities.length;
    const total = lessons.length;

    return {
      totalLessons: total,
      completedLessons: completed,
      progress: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }
}

