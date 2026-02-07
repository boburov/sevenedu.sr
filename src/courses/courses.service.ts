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
import { Dictonary } from '../../generated/prisma';
import { UpdateLessonsBatchDto } from './dto/update.dto';

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
    file: Express.Multer.File,
  ) {
    const { title, isDemo } = createCourse;

    const category = await this.prisma.coursesCategory.findUnique({
      where: { id },
    });
    if (!category) throw new HttpException(`Category Not Found`, 404);

    const videoFileUrl = await this.uploadsService.uploadFile(file, 'videos');

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
        videoUrl: videoFileUrl,
        coursesCategoryId: id,
        order: newOrder,
      },
    });

    return newCourse;
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
