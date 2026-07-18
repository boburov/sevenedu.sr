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
import { UpsertLevelMetaDto } from './dto/upsert-level-meta.dto';
import { Dictonary } from '@prisma/client';

@Injectable()
export class CoursesService {
  constructor(
    private prisma: PrismaService,
    private uploadsService: UploadsService,
  ) { }

  // ── CEFR daraja (modul) meta ─────────────────────────────
  // Kursning darajalari uchun tahrirlangan nom/tavsiflar ro'yxati.
  async getCourseLevels(courseId: string) {
    return this.prisma.courseLevelMeta.findMany({
      where: { courseId },
      orderBy: { order: 'asc' },
    });
  }

  // Bitta darajaning nom/tavsifini saqlash (bor bo'lsa yangilaydi).
  async upsertCourseLevel(courseId: string, dto: UpsertLevelMetaDto) {
    const course = await this.prisma.coursesCategory.findUnique({
      where: { id: courseId },
    });
    if (!course) throw new NotFoundException('Kurs topilmadi');

    return this.prisma.courseLevelMeta.upsert({
      where: { courseId_level: { courseId, level: dto.level } },
      update: {
        title: dto.title,
        description: dto.description ?? null,
        order: dto.order ?? 0,
      },
      create: {
        courseId,
        level: dto.level,
        title: dto.title,
        description: dto.description ?? null,
        order: dto.order ?? 0,
      },
    });
  }

  // Daraja metasini o'chirish (mobile yana qattiq-yozilgan nomga qaytadi).
  async deleteCourseLevel(courseId: string, level: string) {
    await this.prisma.courseLevelMeta.deleteMany({
      where: { courseId, level },
    });
    return { message: 'Daraja meta o‘chirildi' };
  }

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

  async createLessonsBatch(lessons: CreateLessonDto[], categoryId: string) {
  const category = await this.prisma.coursesCategory.findUnique({
    where: { id: categoryId },
  });
  if (!category) throw new HttpException('Category Not Found', 404);

  const lastLesson = await this.prisma.lessons.findFirst({
    where: { coursesCategoryId: categoryId },
    orderBy: { order: 'desc' },
    select: { order: true },
  });

  let order = lastLesson ? lastLesson.order + 1 : 1;

  const created = await this.prisma.$transaction(
    lessons.map((lesson) =>
      this.prisma.lessons.create({
        data: {
          title: lesson.title,
          videoUrl: lesson.videoUrl,
          isDemo: lesson.isDemo,
          level: lesson.level,
          coursesCategoryId: categoryId,
          order: order++,
        },
      })
    )
  );

  return { message: `${created.length} ta lesson yaratildi ✅`, data: created };
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

  // Har bir kurs bo'yicha foydalanuvchining tugatgan darslari foizi.
  // completed = ko'rilgan (LessonActivity) darslar soni, total = ko'rinadigan darslar.
  async getMyProgress(userId: string) {
    // 1) Ko'rinadigan darslar → qaysi kursga tegishli
    const lessons = await this.prisma.lessons.findMany({
      where: { isVisible: true },
      select: { id: true, coursesCategoryId: true },
    });

    const totalByCourse = new Map<string, number>();
    const lessonToCourse = new Map<string, string>();
    for (const l of lessons) {
      totalByCourse.set(
        l.coursesCategoryId,
        (totalByCourse.get(l.coursesCategoryId) ?? 0) + 1,
      );
      lessonToCourse.set(l.id, l.coursesCategoryId);
    }

    // 2) Foydalanuvchi ko'rgan darslar (har dars faqat bir marta)
    const watched = await this.prisma.lessonActivity.findMany({
      where: { userId },
      select: { lessonsId: true },
      distinct: ['lessonsId'],
    });

    const completedByCourse = new Map<string, number>();
    for (const w of watched) {
      const courseId = lessonToCourse.get(w.lessonsId);
      if (!courseId) continue; // ko'rinmaydigan/o'chirilgan dars — hisobga olinmaydi
      completedByCourse.set(
        courseId,
        (completedByCourse.get(courseId) ?? 0) + 1,
      );
    }

    // 3) Natija — har kurs uchun completed/total/percent
    return Array.from(totalByCourse.entries()).map(([courseId, total]) => {
      const completed = Math.min(completedByCourse.get(courseId) ?? 0, total);
      return {
        courseId,
        completed,
        total,
        percent: total === 0 ? 0 : Math.round((completed / total) * 100),
      };
    });
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
            level: true,
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
    const { title, isDemo, level } = createCourse;

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
        level,
        videoUrl: createCourse.videoUrl,
        coursesCategoryId: id,
        order: newOrder,
      },
    });

    return newCourse;
  }

  /**
   * Darslarni ikki darsning orasiga (yoki boshiga) qo'shadi.
   * afterLessonId=null/undefined => boshiga; aks holda shu darsdan keyin.
   * Ko'rinadigan darslar `order` bo'yicha qayta ketma-ketlanadi (reorder pattern).
   */
  async insertLessons(
    categoryId: string,
    afterLessonId: string | null | undefined,
    lessonsData: CreateLessonDto[],
  ) {
    if (!Array.isArray(lessonsData) || lessonsData.length === 0) {
      throw new BadRequestException("Kamida bitta dars kerak");
    }

    const category = await this.prisma.coursesCategory.findUnique({
      where: { id: categoryId },
      include: {
        lessons: {
          where: { isVisible: true },
          orderBy: { order: 'asc' },
        },
      },
    });
    if (!category) throw new HttpException('Category Not Found', 404);

    const existing = category.lessons;

    // Qo'shish pozitsiyasini aniqlash
    let insertIndex: number;
    if (!afterLessonId) {
      insertIndex = 0; // boshiga
    } else {
      const idx = existing.findIndex((l) => l.id === afterLessonId);
      if (idx === -1) {
        throw new NotFoundException(`Dars topilmadi: ${afterLessonId}`);
      }
      insertIndex = idx + 1; // shu darsdan keyin
    }

    return this.prisma.$transaction(async (tx) => {
      // 1) Mavjud ko'rinadigan darslar order'ini vaqtincha manfiy qilamiz (unique konfliktdan qochish)
      await Promise.all(
        existing.map((lesson) =>
          tx.lessons.update({
            where: { id: lesson.id },
            data: { order: -(lesson.order) },
          }),
        ),
      );

      // 2) Yangi darslarni vaqtincha yirik manfiy order bilan yaratamiz
      const created: Array<{ id: string }> = [];
      for (let i = 0; i < lessonsData.length; i++) {
        const d = lessonsData[i];
        const row = await tx.lessons.create({
          data: {
            title: d.title,
            isDemo: d.isDemo ?? false,
            level: d.level,
            videoUrl: d.videoUrl,
            coursesCategoryId: categoryId,
            order: -(1_000_000 + i),
          },
        });
        created.push(row);
      }

      // 3) Yakuniy tartib: mavjudlar + yangilar kerakli joyga qo'yiladi
      const finalOrder = [
        ...existing.slice(0, insertIndex),
        ...created,
        ...existing.slice(insertIndex),
      ];

      // 4) Ketma-ket order (1..N) qayta yoziladi
      await Promise.all(
        finalOrder.map((lesson, index) =>
          tx.lessons.update({
            where: { id: lesson.id },
            data: { order: index + 1 },
          }),
        ),
      );

      return tx.coursesCategory.findUnique({
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

  async updateCategoryThumbnail(id: string, thumbnail: string) {
    const category = await this.prisma.coursesCategory.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Category topilmadi ❌');
    }

    const updated = await this.prisma.coursesCategory.update({
      where: { id },
      data: {
        thumbnail, // yoki sening field noming (thumbnail / image / cover)
      },
    });

    return {
      message: 'Thumbnail yangilandi ✅',
      data: updated,
    };
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
