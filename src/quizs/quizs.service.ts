import { HttpException, Injectable } from '@nestjs/common';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class QuizsService {
  constructor(private prisma: PrismaService) { }

  async create(createQuizDto: CreateQuizDto, lessonId: string) {
    const { quession, option1, option2, option3, current } = createQuizDto;

    const lesson = await this.prisma.lessons.findFirst({ where: { id: lessonId } });

    if (!lesson) throw new HttpException(`Lesson not found`, 404);

    return await this.prisma.quizs.create({
      data: {
        quiz: quession,
        Lessons: {
          connect: { id: lessonId },
        },
        option1,
        option2,
        option3,
        currentOption: option1,
      },
    });
  }

  async findAll(id: string) {
    return await this.prisma.quizs.findFirst({ where: { id } });
  }

  async update(id: string, updateQuizDto: UpdateQuizDto) {
    const { quession, current, option1, option2, option3 } = updateQuizDto;

    return await this.prisma.quizs.update({
      where: { id },
      data: {
        quiz: quession,
        option1,
        option2,
        option3,
        currentOption: current
      }
    })
  }

  async remove(id: string) {
    return await this.prisma.quizs.delete({ where: { id } });
  }
}
