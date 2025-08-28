import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCategoryCourseDto } from './dto/create-course-category.dto';
import { UploadsService } from 'src/uploads/uploads.service';
import { CreateLessonDto } from './dto/create-course.dot';
import * as path from 'path';
import * as fs from 'fs';
import { UpdateCategoryDto } from './dto/update-course.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';

@Injectable()
export class CoursesService {
  constructor(
    private prisma: PrismaService,
    private uploadsService: UploadsService,
    private uploadService: UploadsService

  ) { }

  async generateVocabularyQuiz(lessonId: string) {
    const words = await this.prisma.dictonary.findMany({ where: { lessonsId: lessonId } });

    const quizWords = this.shuffleArray(words).slice(0, 10);

    return quizWords.map(word => {
      const wrongOptions = this.shuffleArray(
        words.filter(w => w.id !== word.id)
      ).slice(0, 3).map(w => w.translated);

      const options = this.shuffleArray([...wrongOptions, word.translated]);

      return {
        word: word.word,
        correct: word.translated,
        options,
      };
    });
  }

  async saveVocabularyResult(lessonId: string, userId: string, correct: number, wrong: number) {
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
      .map(value => ({ value, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ value }) => value);
  }

  async getAll() {
    const course = await this.prisma.coursesCategory.findMany({
      include: {
        lessons: {
          include: {
            quizs: true,
            dictonary: true
          }
        }
      }
    });
    return course;
  }

  async getLessonById(id: string) {
    const lesson = await this.prisma.lessons.findFirst({ where: { id, }, include: { quizs: true, dictonary: true } })
    return lesson
  }

  async getcategory(id: string) {
    const get = this.prisma.coursesCategory.findFirst({ where: { id }, include: { lessons: true } });
    return get;
  }

  async createCategory(
    dto: CreateCategoryCourseDto,
    file: Express.Multer.File
  ) {
    const { title, shortName, goal } = dto;

    const existing = await this.prisma.coursesCategory.findFirst({ where: { shortName } });
    if (existing) throw new HttpException('Bu kategoriya allaqachon mavjud!', 400);

    const uploadedThumbnail = await this.uploadsService.uploadFile(file, 'images');

    const newCategory = await this.prisma.coursesCategory.create({
      data: {
        title,
        shortName,
        goal,
        thumbnail: uploadedThumbnail,
      },
    });

    return newCategory;
  }


  async updateLessonOrdersByCategory() {
    const categories = await this.prisma.lessons.findMany({
      distinct: ['coursesCategoryId'],
      select: {
        coursesCategoryId: true,
      },
    });

    for (const { coursesCategoryId } of categories) {
      const lessons = await this.prisma.lessons.findMany({
        where: { coursesCategoryId },
        orderBy: { id: 'asc' },
      });

      for (let i = 0; i < lessons.length; i++) {
        await this.prisma.lessons.update({
          where: { id: lessons[i].id },
          data: { order: i },
        });
      }
    }

    return { message: 'Darslar muvaffaqiyatli tartiblandi.' };
  }

  async fixAllVideoUrls() {
    const lessons = await this.prisma.lessons.findMany({
      where: {
        videoUrl: {
          contains: '-',
        },
      },
    });

    const updatedLessons: {
      lessonId: string;
      oldUrl: string;
      newUrl: string;
    }[] = [];

    for (const lesson of lessons) {
      const oldUrl = lesson.videoUrl;

      const filename = oldUrl.split('/').pop();
      if (!filename) continue;

      const parts = filename.split('-');
      if (parts.length < 2) continue;

      const correctFilename = parts[1]; const correctUrl = oldUrl.replace(filename, correctFilename);

      await this.prisma.lessons.update({
        where: { id: lesson.id },
        data: {
          videoUrl: correctUrl,
        },
      });

      updatedLessons.push({
        lessonId: lesson.id,
        oldUrl,
        newUrl: correctUrl,
      });
    }

    return {
      updatedCount: updatedLessons.length,
      updatedLessons,
    };
  }


  async createCourse(createCourse: CreateLessonDto, id: string, file: Express.Multer.File) {
    const { title, isDemo, } = createCourse;

    const category = await this.prisma.coursesCategory.findUnique({ where: { id } });
    if (!category) throw new HttpException(`Category Not Found`, 404);

    const videoFileUrl = await this.uploadsService.uploadFile(file, 'videos');
    const count = await this.prisma.lessons.count({ where: { coursesCategoryId: id } });

    const newCourse = await this.prisma.lessons.create({
      data: {
        title,
        isDemo,
        videoUrl: videoFileUrl,
        coursesCategoryId: id,
        order: count + 1,
      }
    });

    return newCourse;
  }

  async updateCategory(id: string, dto: UpdateCategoryDto, file?: Express.Multer.File) {
    const existingCategory = await this.prisma.coursesCategory.findUnique({ where: { id } });
    if (!existingCategory) throw new NotFoundException('Kategoriya topilmadi');

    if (file) {
      const oldUrl = existingCategory.thumbnail;
      const oldKey = new URL(oldUrl).pathname.slice(1);
      await this.uploadsService.deleteFile(oldKey);

      const newThumbnailUrl = await this.uploadsService.uploadFile(file, 'images');
      dto.thumbnail = newThumbnailUrl;
    }

    return this.prisma.coursesCategory.update({
      where: { id },
      data: { ...dto },
    });
  }

  async updateLesson(id: string, dto: UpdateLessonDto, file?: Express.Multer.File) {
    const existingLesson = await this.prisma.lessons.findUnique({ where: { id } });

    if (!existingLesson) {
      throw new NotFoundException('Dars topilmadi');
    }

    if (file) {
      const oldUrl = existingLesson.videoUrl;

      if (oldUrl) {
        const oldKey = new URL(oldUrl).pathname.slice(1);
        await this.uploadsService.deleteFile(oldKey);

      }
      const newVideoUrl = await this.uploadsService.uploadFile(file, 'videos');
      dto.videoUrl = newVideoUrl;

    }

    if (typeof dto.isDemo === 'string') {
      dto.isDemo = dto.isDemo === 'true';
    }

    return this.prisma.lessons.update({
      where: { id },
      data: {
        ...dto,
      },
    });
  }

  async deleteLesson(id: string) {
    return this.prisma.$transaction(async (tx) => {
      // Bog‘langan childlarni avval o‘chir
      await tx.dictonary.deleteMany({ where: { lessonsId: id } });
      await tx.quizs.deleteMany({ where: { lessonsId: id } });
      await tx.quessions.deleteMany({ where: { lessonsId: id } });
      await tx.lessonActivity.deleteMany({ where: { lessonsId: id } }); // <-- bu MUHIM!

      // Keyin asosiy lesson’ni o‘chir
      const lesson = await tx.lessons.delete({ where: { id } });

      if (lesson.videoUrl) {
        await this.uploadService.deleteFile(lesson.videoUrl);
      }

      return { msg: "Lesson va barcha childlar muvaffaqiyatli o‘chirildi" };
    });
  }



  async removeCategory(id: string) {
    const category = await this.prisma.coursesCategory.findFirst({ where: { id } });
    if (!category) throw new NotFoundException('Kategoriya topilmadi');

    const uploadsDir = path.resolve(process.cwd(), 'images');
    const imageName = path.basename(category.thumbnail);
    const filePath = path.join(uploadsDir, imageName);

    const url = new URL(category.thumbnail);
    const fileKey = url.pathname.substring(1);

    const deleted = await this.uploadsService.deleteFile(fileKey);
    if (!deleted) throw new HttpException('Rasmni o‘chirishda xatolik yuz berdi', 500);

    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error('Faylni o‘chirishda xatolik:', err.message);
    }

    await this.prisma.coursesCategory.delete({ where: { id } });
    return { message: 'Kategoriya va rasm o‘chirildi' };
  }
}
