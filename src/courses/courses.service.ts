import {
  BadRequestException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryCourseDto } from './dto/create-course-category.dto';
import { UploadsService } from '../uploads/uploads.service';
import { CreateLessonDto } from './dto/create-course.dot';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { UpdateLessonsBatchDto } from './dto/update.dto';
import { Dictonary } from '@prisma/client';

@Injectable()
export class CoursesService {
  constructor(
    private prisma: PrismaService,
    private uploadsService: UploadsService,
  ) { }

  async generateVocabularyQuiz(lessonId: string) {
    const words: Dictonary[] = await this.prisma.dictonary.findMany({
      where: { lessonsId: lessonId },
    });

    const quizWords = this.shuffleArray(words).slice(0, 10);

    return quizWords.map((word) => {
      const wrongOptions = this.shuffleArray(
        words.filter((w) => w.id !== word.id),
      )
        .slice(0, 3)
        .map((w) => w.translated);

      const options = this.shuffleArray([...wrongOptions, word.translated]);

      return {
        word: word.word,
        correct: word.translated,
        options,
      };
    });
  }

  // courses.service.ts
  async fixAllVideoUrls(data: { id: string; videoUrl: string }[]) {
    if (!data) {
      throw new BadRequestException('Data kelmadi ❌');
    }

    if (!Array.isArray(data)) {
      throw new BadRequestException('Data array bo‘lishi kerak ❌');
    }

    if (data.length === 0) {
      return { message: 'Hech nima yo‘q 🤷‍♂️' };
    }

    const updates = data.map((item) =>
      this.prisma.lessons.update({
        where: { id: item.id },
        data: { videoUrl: item.videoUrl },
      }),
    );

    await this.prisma.$transaction(updates);

    return {
      message: `${data.length} ta lesson update bo‘ldi ✅`,
    };
  }

  async saveVocabularyResult(
    lessonId: string,
    userId: string,
    correct: number,
    wrong: number,
  ) {
    const existing = await this.prisma.lessonActivity.findFirst({
      where: { userId, lessonsId: lessonId },
    });

    if (existing) {
      return this.prisma.lessonActivity.update({
        where: { id: existing.id },
        data: { vocabularyCorrect: correct, vocabularyWrong: wrong },
      });
    }

    return this.prisma.lessonActivity.create({
      data: {
        userId,
        lessonsId: lessonId,
        vocabularyCorrect: correct,
        vocabularyWrong: wrong,
      },
    });
  }

  private shuffleArray<T>(array: T[]): T[] {
    return array
      .map((value) => ({ value, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ value }) => value);
  }

  async getAll() {
    const courses = await this.prisma.coursesCategory.findMany({
      include: {
        lessons: {
          select: {
            id: true,
            title: true,
            isDemo: true,
            videoUrl: true,
            sentencePuzzles: true,
            order: true,
            isVisible: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });
    return courses;
  }

  async createCourse(
    createCourse: CreateLessonDto,
    id: string,
  ) {
    const { title, isDemo } = createCourse;

    const category = await this.prisma.coursesCategory.findUnique({
      where: { id },
    });
    if (!category) throw new HttpException(`Category Not Found`, 404);


    const lastLesson = await this.prisma.lessons.findFirst({
      where: { coursesCategoryId: id },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const newOrder = lastLesson ? lastLesson.order + 1 : 1;

    const newCourse = await this.prisma.lessons.create({
      data: {
        title,
        isDemo,
        videoUrl: createCourse.videoUrl,
        coursesCategoryId: id,
        order: newOrder,
      },
    });

    return newCourse;
  }

  // courses.service.ts
  async batchDeleteLessons(lessonIds: string[]) {
    const result = await this.prisma.lessons.deleteMany({
      where: { id: { in: lessonIds } },
    });

    return {
      message: `${result.count} ta lesson database’dan o‘chirildi ✅`,
    };
  }

  async deleteLesson(id: string) {
    const lesson = await this.prisma.lessons.findFirst({
      where: { id },
    });
    if (!lesson) {
      throw new Error('Lesson topilmadi');
    }

    return this.prisma.lessons.update({
      where: { id },
      data: { isVisible: false, order: NaN },
    });
  }

  async deleteAllInvisibleLessons() {
    const { count } = await this.prisma.lessons.deleteMany({
      where: {
        isVisible: false,
      },
    });

    return {
      msg: `${count} ta ko'rinmas dars butunlay o'chirildi! 🗑️`,
      deletedCount: count,
    };
  }
}
