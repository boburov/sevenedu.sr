import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitCertificateTestDto } from './dto/submit-certificate-test.dto';
import { CertificatePdfService } from './certificate-pdf.service';

/** Sertifikat olish uchun kerakli minimal ball (%). */
const PASS_SCORE = 80;

/** Yakuniy testdagi savollar soni. */
const QUESTION_COUNT = 30;

/** Lug'at savoliga nechta noto'g'ri variant qo'shiladi. */
const WRONG_OPTIONS = 3;

type QuestionSource = 'quiz' | 'word';

/** Savol identifikatori: `quiz:<id>` yoki `word:<id>`. */
const encodeId = (source: QuestionSource, id: string) => `${source}:${id}`;

function decodeId(value: string): { source: QuestionSource; id: string } {
  const [source, ...rest] = value.split(':');
  if ((source !== 'quiz' && source !== 'word') || rest.length === 0) {
    throw new BadRequestException(`Savol identifikatori noto'g'ri: ${value}`);
  }
  return { source, id: rest.join(':') };
}

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

@Injectable()
export class CertificateService {
  constructor(
    private prisma: PrismaService,
    private pdf: CertificatePdfService,
  ) { }

  // ── Holat ────────────────────────────────────────────────────────────────

  /**
   * Kurs bo'yicha sertifikat holati: darslar tugadimi, sertifikat berilganmi.
   * Mobil ilova kurs sahifasidagi tugmani shu javob asosida ko'rsatadi.
   */
  async getCourseStatus(userId: string, courseId: string) {
    const { totalLessons, completedLessons } = await this.lessonProgress(userId, courseId);
    const certificate = await this.prisma.certificate.findUnique({
      where: { userId_courseId: { userId, courseId } },
      include: { course: { select: { title: true } } },
    });

    return {
      totalLessons,
      completedLessons,
      lessonsDone: totalLessons > 0 && completedLessons >= totalLessons,
      passScore: PASS_SCORE,
      questionCount: QUESTION_COUNT,
      certificate: certificate && this.toListItem(certificate),
    };
  }

  // ── Yakuniy test ─────────────────────────────────────────────────────────

  /**
   * Yakuniy test savollari. To'g'ri javob qaytarilmaydi — baholashni server
   * qiladi, shuning uchun mijoz o'z ballini "chizib" yubora olmaydi.
   */
  async generateCertificateTest(userId: string, courseId: string) {
    await this.assertLessonsDone(userId, courseId);

    const lessons = await this.prisma.lessons.findMany({
      where: { coursesCategoryId: courseId, isVisible: true },
      select: {
        quizs: { select: { id: true, quiz: true, option1: true, option2: true, option3: true, currentOption: true } },
        dictonary: { select: { id: true, word: true, translated: true } },
      },
    });

    const quizQuestions = lessons.flatMap((lesson) =>
      lesson.quizs.map((q) => ({
        id: encodeId('quiz', q.id),
        question: q.quiz,
        options: shuffle([q.option1, q.option2, q.option3, q.currentOption]),
      })),
    );

    const words = lessons.flatMap((lesson) => lesson.dictonary);
    const wordQuestions = words.map((word) => {
      // Chalg'ituvchi variantlar shu kursning o'z lug'atidan olinadi — begona
      // mavzudagi so'z variantlar ichida darrov ko'zga tashlanib qolmaydi.
      const wrong = shuffle(words.filter((w) => w.id !== word.id && w.translated !== word.translated))
        .slice(0, WRONG_OPTIONS)
        .map((w) => w.translated);
      return {
        id: encodeId('word', word.id),
        question: `"${word.word}" so‘zining tarjimasini tanlang`,
        options: shuffle([word.translated, ...wrong]),
      };
    });

    // Variant yetarli bo'lmagan savollar (masalan lug'atda 4 tadan kam so'z bor)
    // testga qo'shilmaydi — aks holda javobni topish juda oson bo'lib qoladi.
    const pool = [...quizQuestions, ...wordQuestions].filter((q) => q.options.length === WRONG_OPTIONS + 1);
    if (pool.length === 0) {
      throw new BadRequestException('Bu kursda yakuniy test uchun savollar yetarli emas.');
    }

    return {
      passScore: PASS_SCORE,
      questions: shuffle(pool).slice(0, QUESTION_COUNT),
    };
  }

  /**
   * Test javoblarini baholaydi. Ball yetarli bo'lsa sertifikat beriladi (yoki
   * allaqachon berilgani qaytariladi).
   */
  async submitCertificateTest(userId: string, courseId: string, dto: SubmitCertificateTestDto) {
    await this.assertLessonsDone(userId, courseId);

    const existing = await this.prisma.certificate.findUnique({
      where: { userId_courseId: { userId, courseId } },
      include: { course: { select: { title: true } } },
    });
    if (existing) {
      return { passed: true, score: existing.score, certificate: this.toListItem(existing) };
    }

    const score = await this.grade(courseId, dto);
    if (score < PASS_SCORE) {
      return { passed: false, score, passScore: PASS_SCORE, certificate: null };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, surname: true },
    });
    const fullName = [user?.name, user?.surname].filter(Boolean).join(' ').trim();
    if (!fullName) {
      throw new BadRequestException(
        'Sertifikat berish uchun profilda ism va familiya to‘ldirilgan bo‘lishi kerak.',
      );
    }

    const certificate = await this.prisma.certificate.create({
      data: { userId, courseId, score, fullName },
      include: { course: { select: { title: true } } },
    });

    // Kursni tugallangan deb belgilaymiz — profil statistikasi shundan o'qiydi.
    await this.prisma.userCourse.updateMany({
      where: { userId, courseId },
      data: { isFinished: true },
    });

    return { passed: true, score, certificate: this.toListItem(certificate) };
  }

  // ── Sertifikatlar ────────────────────────────────────────────────────────

  async listForUser(userId: string) {
    const certificates = await this.prisma.certificate.findMany({
      where: { userId },
      orderBy: { issuedAt: 'desc' },
      include: { course: { select: { title: true } } },
    });
    return certificates.map((c) => this.toListItem(c));
  }

  /** Sertifikat PDF si — faqat egasiga beriladi. */
  async renderPdf(userId: string, certificateId: string) {
    const certificate = await this.prisma.certificate.findUnique({
      where: { id: certificateId },
      include: { course: { select: { title: true } } },
    });
    if (!certificate) throw new NotFoundException('Sertifikat topilmadi');
    if (certificate.userId !== userId) throw new ForbiddenException('Bu sertifikat sizga tegishli emas');

    const pdf = await this.pdf.render({
      number: certificate.number,
      fullName: certificate.fullName,
      courseTitle: certificate.course.title,
      issuedAt: certificate.issuedAt,
    });

    return { pdf, filename: this.fileName(certificate.number, certificate.course.title) };
  }

  // ── Ichki yordamchilar ───────────────────────────────────────────────────

  private toListItem(certificate: {
    id: string;
    number: number;
    score: number;
    fullName: string;
    issuedAt: Date;
    courseId: string;
    course: { title: string };
  }) {
    return {
      id: certificate.id,
      number: certificate.number,
      courseId: certificate.courseId,
      courseTitle: certificate.course.title,
      fullName: certificate.fullName,
      score: certificate.score,
      issuedAt: certificate.issuedAt,
      fileName: this.fileName(certificate.number, certificate.course.title),
    };
  }

  private fileName(number: number, courseTitle: string) {
    const slug = courseTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return `sertifikat-${String(number).padStart(3, '0')}${slug ? `-${slug}` : ''}.pdf`;
  }

  /**
   * Kursdagi ko'rinadigan darslar soni va foydalanuvchi tugatganlari.
   *
   * LessonActivity.courseId hamma joyda to'ldirilmaydi (masalan
   * `user/mark-lesson-seen` uni yozmaydi), shuning uchun dars orqali bog'lanamiz.
   */
  private async lessonProgress(userId: string, courseId: string) {
    const lessonFilter = { coursesCategoryId: courseId, isVisible: true };
    const [totalLessons, completedLessons] = await Promise.all([
      this.prisma.lessons.count({ where: lessonFilter }),
      this.prisma.lessonActivity.count({ where: { userId, lesson: lessonFilter } }),
    ]);
    return { totalLessons, completedLessons };
  }

  private async assertLessonsDone(userId: string, courseId: string) {
    const enrollment = await this.prisma.userCourse.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (!enrollment) throw new ForbiddenException('Bu foydalanuvchi ushbu kursga yozilmagan.');

    const { totalLessons, completedLessons } = await this.lessonProgress(userId, courseId);
    if (totalLessons === 0) throw new BadRequestException('Bu kursda darslar yo‘q.');
    if (completedLessons < totalLessons) {
      throw new BadRequestException(
        `Avval barcha darslarni yakunlang (${completedLessons}/${totalLessons}).`,
      );
    }
  }

  /** Javoblarni bazadagi to'g'ri variantlar bilan solishtiradi, ballni % da qaytaradi. */
  private async grade(courseId: string, dto: SubmitCertificateTestDto) {
    const ids = dto.answers.map((a) => decodeId(a.questionId));
    const quizIds = ids.filter((i) => i.source === 'quiz').map((i) => i.id);
    const wordIds = ids.filter((i) => i.source === 'word').map((i) => i.id);

    const [quizs, words] = await Promise.all([
      this.prisma.quizs.findMany({
        // Boshqa kursning savoli yuborilsa hisobga olinmaydi.
        where: { id: { in: quizIds }, Lessons: { coursesCategoryId: courseId } },
        select: { id: true, currentOption: true },
      }),
      this.prisma.dictonary.findMany({
        where: { id: { in: wordIds }, Lessons: { coursesCategoryId: courseId } },
        select: { id: true, translated: true },
      }),
    ]);

    const correctAnswers = new Map<string, string>([
      ...quizs.map((q) => [encodeId('quiz', q.id), q.currentOption] as const),
      ...words.map((w) => [encodeId('word', w.id), w.translated] as const),
    ]);

    if (correctAnswers.size === 0) {
      throw new BadRequestException('Yuborilgan javoblar bu kursga tegishli emas.');
    }

    const correct = dto.answers.filter(
      (a) => correctAnswers.get(a.questionId)?.trim() === a.answer.trim(),
    ).length;

    return Math.round((correct / correctAnswers.size) * 100);
  }
}
