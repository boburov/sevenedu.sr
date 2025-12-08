import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SentencePuzzleService {
  constructor(private prisma: PrismaService) {}

  // Create
  async create(lessonId: string, sentence: string, answer: string) {
    return this.prisma.sentencePuzzle.create({
      data: {
        sentence,
        answer,
        lessonId,
      },
    });
  }

  // Update
  async update(id: string, sentence?: string, answer?: string) {
    return this.prisma.sentencePuzzle.update({
      where: { id },
      data: {
        ...(sentence && { sentence }),
        ...(answer && { answer }),
      },
    });
  }

  // Delete
  async remove(id: string) {
    await this.prisma.sentencePuzzle.delete({ where: { id } });
    return { msg: 'SentencePuzzle deleted' };
  }

  // Agar kerak bo‘lsa: dars bo‘yicha hamma puzzle-larni olish
  async findByLesson(lessonId: string) {
    return this.prisma.sentencePuzzle.findMany({
      where: { lessonId },
    });
  }
}
