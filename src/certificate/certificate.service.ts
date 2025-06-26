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
}
