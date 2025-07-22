import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCertificateDto } from './dto/create-certificate.dto';

@Injectable()
export class CertificateService {
  constructor(private prisma: PrismaService) { }

  async submitCertificate(dto: CreateCertificateDto) {
    const { userId, courseId, answers } = dto;
    const userCourse = await this.prisma.userCourse.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    });

    if (!userCourse) {
      throw new BadRequestException("Bu foydalanuvchi ushbu kursga yozilmagan.");
    }


    const totalLessons = await this.prisma.lessons.count({
      where: { coursesCategoryId: courseId },
    });

    const completedLessons = await this.prisma.lessonActivity.count({
      where: { userId, courseId },
    });

    if (completedLessons < totalLessons) {
      throw new BadRequestException('Barcha darslar ko‘rilmagan.');
    }

    const correct = answers.filter(a => a.isCorrect === 1).length;
    const total = answers.length;
    const score = Math.round((correct / total) * 100);

    if (score < 80) {
      throw new BadRequestException(`Kamida 80% to‘g‘ri bo‘lishi kerak. Sizning ball: ${score}`);
    }

    const existing = await this.prisma.certificate.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });

    if (existing) return existing;

    return await this.prisma.certificate.create({
      data: {
        userId,
        courseId,
        score,
      },
    });
  }

  async generateCertificateTest(userId: string, courseId: string) {
    const lessons = await this.prisma.lessons.findMany({
      where: { coursesCategoryId: courseId },
      include: {
        quizs: true,
        dictonary: true,
      },
    });

    let questions: any[] = [];

    for (const lesson of lessons) {
      for (const q of lesson.quizs) {
        questions.push({
          question: q.quiz,
          options: [q.option1, q.option2, q.option3, q.currentOption].sort(() => Math.random() - 0.5),
          correctOption: q.currentOption,
          source: "quiz",
          lessonId: lesson.id,
        });
      }

      for (const d of lesson.dictonary) {
        const wrongs = await this.prisma.dictonary.findMany({
          where: { NOT: { id: d.id } },
          take: 3,
        });

        const options = [
          d.translated,
          ...wrongs.map((w) => w.translated),
        ].sort(() => Math.random() - 0.5);

        questions.push({
          question: `"${d.word}" so‘zining tarjimasini tanlang`,
          options,
          correctOption: d.translated,
          source: "dictionary",
          lessonId: lesson.id,
        });
      }
    }

    questions = questions.sort(() => Math.random() - 0.5);

    return questions.slice(0, 150);
  }

}
