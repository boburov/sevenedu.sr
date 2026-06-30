import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VimeoService } from '../../vimeo/vimeo.service';

export interface LessonDownloadResponse {
  lessonId: string;
  url: string;
  sizeBytes: number | null;
  quality: string | null;
  durationSec: number | null;
  expiresAt: string; // ISO
}

/**
 * Dars videosi uchun yangi (qisqa muddatli) yuklab olish linkini qaytaradi.
 * Auth + enrollment tekshiruvidan keyin Vimeo API'dan progressive MP4 oladi.
 */
@Injectable()
export class GetLessonDownload {
  constructor(
    private prisma: PrismaService,
    private vimeo: VimeoService,
  ) {}

  async execute(
    lessonId: string,
    user: { id: string; isAdmin?: boolean },
  ): Promise<LessonDownloadResponse> {
    const lesson = await this.prisma.lessons.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        videoUrl: true,
        vimeoId: true,
        isDemo: true,
        coursesCategoryId: true,
      },
    });
    if (!lesson) throw new NotFoundException('Dars topilmadi');

    // ── Enrollment tekshiruvi (demo darslar har qaysi authed user uchun) ──
    const isAdmin = user.isAdmin || user.id === 'admin';
    if (!lesson.isDemo && !isAdmin) {
      const enrollment = await this.prisma.userCourse.findUnique({
        where: {
          userId_courseId: {
            userId: user.id,
            courseId: lesson.coursesCategoryId,
          },
        },
        select: { id: true },
      });
      if (!enrollment) {
        throw new ForbiddenException(
          'Bu kursga yozilmagansiz — yuklab bo‘lmaydi',
        );
      }
    }

    // ── Legacy S3 video (Vimeo emas) → URL'ni to'g'ridan-to'g'ri qaytar ──
    if (lesson.videoUrl && !lesson.videoUrl.includes('vimeo')) {
      return {
        lessonId: lesson.id,
        url: lesson.videoUrl,
        sizeBytes: null,
        quality: null,
        durationSec: null,
        // S3 linki signed emas (public) — uzoq muddat
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };
    }

    const vimeoId =
      lesson.vimeoId || this.vimeo.extractVimeoId(lesson.videoUrl || '');
    if (!vimeoId) {
      throw new ConflictException({
        code: 'NO_VIMEO_ID',
        message: 'Video manzilidan Vimeo ID topilmadi',
      });
    }

    const info = await this.vimeo.getDownloadInfo(vimeoId);

    // Metadata'ni darsга cache qilamiz (best-effort, xato bo'lsa ham davom)
    this.prisma.lessons
      .update({
        where: { id: lesson.id },
        data: {
          vimeoId,
          downloadable: info.downloadable,
          durationSec: info.durationSec ?? undefined,
          sizeBytes:
            info.sizeBytes != null ? BigInt(info.sizeBytes) : undefined,
        },
      })
      .catch(() => undefined);

    if (!info.downloadable || !info.url) {
      throw new ConflictException({
        code: 'DOWNLOAD_NOT_ENABLED',
        message: 'Bu video uchun yuklab olish yoqilmagan',
      });
    }

    return {
      lessonId: lesson.id,
      url: info.url,
      sizeBytes: info.sizeBytes,
      quality: info.quality,
      durationSec: info.durationSec,
      expiresAt: info.expiresAt.toISOString(),
    };
  }
}
