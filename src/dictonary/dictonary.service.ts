import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DictonaryService {
  constructor(private prisma: PrismaService) {}

  async createMany(
    items: { word: string; translated: string }[] | { word: string; translated: string },
    lessonId: string,
  ) {
    const data = Array.isArray(items) ? items : [items];

    if (data.length === 0) {
      throw new BadRequestException('Kamida bitta so‘z bo‘lishi kerak');
    }

    return this.prisma.dictonary.createMany({
      data: data.map((item) => ({
        word: item.word,
        translated: item.translated,
        lessonsId: lessonId,
      })),
    });
  }

  async getByLessonId(lessonId: string) {
    const words = await this.prisma.dictonary.findMany({
      where: { lessonsId: lessonId },
      orderBy: { word: 'asc' },
    });

    if (!words || words.length === 0) {
      throw new NotFoundException('Bu darsga lug‘at topilmadi');
    }

    return words;
  }

  async update(id: string, body: Partial<{ word: string; translated: string }>) {
    return this.prisma.dictonary.update({
      where: { id },
      data: body,
    });
  }

  async remove(id: string) {
    return this.prisma.dictonary.delete({ where: { id } });
  }
}
