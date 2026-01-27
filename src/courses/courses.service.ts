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
import * as path from 'path';
import * as fs from 'fs';
import { UpdateCategoryDto } from './dto/update-course.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { Dictonary } from '../../generated/prisma';
import { UpdateLessonsBatchDto } from './dto/update.dto';

@Injectable()
export class CoursesService {
  constructor(
    private prisma: PrismaService,
    private uploadsService: UploadsService,
    private uploadService: UploadsService,
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

  async reorderLessons(
    categoryId: string,
    reorderData:
      | { lessonId: string; newIndex: number }
      | Array<{ lessonId: string; newIndex: number }>,
  ) {
    const category = await this.prisma.coursesCategory.findUnique({
      where: { id: categoryId },
      include: {
        lessons: {
          where: { isVisible: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!category) throw new NotFoundException('Category not found');

    const reorderArray = Array.isArray(reorderData)
      ? reorderData
      : [reorderData];
    const usedIndexes = new Set<number>();

    // Validatsiyalar
    for (const item of reorderArray) {
      const lessonExists = category.lessons.some(
        (lesson) => lesson.id === item.lessonId,
      );
      if (!lessonExists)
        throw new NotFoundException(`Lesson ${item.lessonId} not found`);

      if (item.newIndex < 0 || item.newIndex >= category.lessons.length) {
        throw new BadRequestException(
          `Invalid index ${item.newIndex} for lesson ${item.lessonId}`,
        );
      }

      if (usedIndexes.has(item.newIndex)) {
        throw new BadRequestException(`Duplicate index ${item.newIndex}`);
      }
      usedIndexes.add(item.newIndex);
    }

    return await this.prisma.$transaction(async (tx) => {
      // Vaqtincha barcha orderlarni negative qilish
      await Promise.all(
        category.lessons.map((lesson) =>
          tx.lessons.update({
            where: { id: lesson.id },
            data: { order: -lesson.order },
          }),
        ),
      );

      // Yangi tartib
      const reorderedLessons = [...category.lessons];

      // Barcha o'zgartirishlarni bajarish
      reorderArray.forEach((item) => {
        const currentIndex = reorderedLessons.findIndex(
          (l) => l.id === item.lessonId,
        );
        if (currentIndex !== -1) {
          const [movedLesson] = reorderedLessons.splice(currentIndex, 1);
          reorderedLessons.splice(item.newIndex, 0, movedLesson);
        }
      });

      // Yangi orderlarni yangilash
      await Promise.all(
        reorderedLessons.map((lesson, index) =>
          tx.lessons.update({
            where: { id: lesson.id },
            data: { order: index + 1 },
          }),
        ),
      );

      return await tx.coursesCategory.findUnique({
        where: { id: categoryId },
        include: {
          lessons: {
            where: { isVisible: true },
            orderBy: { order: 'asc' },
          },
        },
      });
    });
  }

  async getcategory(id: string) {
    const get = await this.prisma.coursesCategory.findFirst({
      where: { id },
      include: {
        lessons: {
          select: {
            id: true,
            title: true,
            isDemo: true,
            videoUrl: true,
            order: true,
            isVisible: true, // shu yerda ham
          },
          orderBy: { order: 'asc' },
        },
      },
    });
    return get;
  }
  async getLessonById(id: string) {
    const lesson = await this.prisma.lessons.findFirst({
      where: { id },
      include: {},
    });

    if (!lesson) throw new NotFoundException('Dars topilmadi');
    return lesson;
  }

  async createCategory(
    dto: CreateCategoryCourseDto,
    file: Express.Multer.File,
  ) {
    const { title, shortName, goal } = dto;

    const existing = await this.prisma.coursesCategory.findFirst({
      where: { shortName },
    });
    if (existing)
      throw new HttpException('Bu kategoriya allaqachon mavjud!', 400);

    const uploadedThumbnail = await this.uploadsService.uploadFile(
      file,
      'images',
    );

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
x
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

      const correctFilename = parts[1];
      const correctUrl = oldUrl.replace(filename, correctFilename);

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

  async updateCategory(
    id: string,
    dto: UpdateCategoryDto,
    file?: Express.Multer.File,
  ) {
    const existingCategory = await this.prisma.coursesCategory.findUnique({
      where: { id },
    });
    if (!existingCategory) throw new NotFoundException('Kategoriya topilmadi');

    if (file) {
      const oldUrl = existingCategory.thumbnail;
      const oldKey = new URL(oldUrl).pathname.slice(1);
      await this.uploadsService.deleteFile(oldKey);

      const newThumbnailUrl = await this.uploadsService.uploadFile(
        file,
        'images',
      );
      dto.thumbnail = newThumbnailUrl;
    }

    return this.prisma.coursesCategory.update({
      where: { id },
      data: { ...dto },
    });
  }

  async updateLesson(
    id: string,
    dto: UpdateLessonDto,
    file?: Express.Multer.File,
  ) {
    const existingLesson = await this.prisma.lessons.findUnique({
      where: { id },
    });

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

  async updateLessonsBatch(dto: UpdateLessonsBatchDto) {
    if (!dto.updates?.length) {
      throw new BadRequestException('updates bo‘sh bo‘lishi mumkin emas');
    }

    // duplicate id check
    const ids = dto.updates.map((u) => u.id);
    const unique = new Set(ids);
    if (unique.size !== ids.length) {
      throw new BadRequestException('updates ichida takrorlangan id bor');
    }

    // mavjudligini tekshir
    const existing = await this.prisma.lessons.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });

    if (existing.length !== ids.length) {
      const existingIds = new Set(existing.map((e) => e.id));
      const missing = ids.filter((id) => !existingIds.has(id));
      throw new NotFoundException(`Lessons topilmadi: ${missing.join(', ')}`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const results = [];

      for (const item of dto.updates) {
        // faqat kelgan fieldlarni update qilamiz
        const data: any = {};
        if (typeof item.title !== 'undefined') data.title = item.title;
        if (typeof item.isDemo !== 'undefined') data.isDemo = item.isDemo;
        if (typeof item.isVisible !== 'undefined') data.isVisible = item.isVisible;
        if (typeof item.videoUrl !== 'undefined') data.videoUrl = item.videoUrl;
        if (typeof item.order !== 'undefined') data.order = item.order;

        if (Object.keys(data).length === 0) {
          // bu item umuman update bermagan
          throw new BadRequestException(
            `Lesson ${item.id} uchun update field yo‘q`,
          );
        }

        const row = await tx.lessons.update({
          where: { id: item.id },
          data,
          select: {
            id: true,
            title: true,
            isDemo: true,
            isVisible: true,
            videoUrl: true,
            order: true,
          },
        });

        // results.push(row);
      }

      return results;
    });

    return {
      updatedCount: updated.length,
      lessons: updated,
    };
  }

  async removeCategory(id: string) {
    const category = await this.prisma.coursesCategory.findFirst({
      where: { id },
    });
    if (!category) throw new NotFoundException('Kategoriya topilmadi');

    const uploadsDir = path.resolve(process.cwd(), 'images');
    const imageName = path.basename(category.thumbnail);
    const filePath = path.join(uploadsDir, imageName);

    const url = new URL(category.thumbnail);
    const fileKey = url.pathname.substring(1);

    const deleted = await this.uploadsService.deleteFile(fileKey);
    if (!deleted)
      throw new HttpException('Rasmni o‘chirishda xatolik yuz berdi', 500);

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
