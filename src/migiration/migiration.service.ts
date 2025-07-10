import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class MigirationService {
  constructor(private readonly prisma: PrismaService) {}

  private processUrl(url: string, folder: 'images' | 'videos'): string {
    if (!url || !url.includes(`/${folder}/`)) return url;

    const regex = new RegExp(`/${folder}/(\\d+-)?(\\d+\\.(png|jpg|jpeg|mp4))$`);
    const match = url.match(regex);
    if (match) {
      return `https://sevenedu-bucket.s3.eu-north-1.amazonaws.com/${folder}/${match[2]}`;
    }

    return url;
  }

  async fixAllUrls() {
    const lessons = await this.prisma.lessons.findMany({
      select: {
        id: true,
        videoUrl: true,
      },
    });

    const updatedLessons = lessons.filter((lesson) => {
      const fixed = this.processUrl(lesson.videoUrl, 'videos');
      return fixed !== lesson.videoUrl;
    });

    for (const lesson of updatedLessons) {
      const fixed = this.processUrl(lesson.videoUrl, 'videos');
      await this.prisma.lessons.update({
        where: { id: lesson.id },
        data: { videoUrl: fixed },
      });
    }

    const categories = await this.prisma.coursesCategory.findMany({
      select: {
        id: true,
        thumbnail: true,
      },
    });

    const updatedCategories = categories.filter((cat) => {
      const fixed = this.processUrl(cat.thumbnail, 'images');
      return fixed !== cat.thumbnail;
    });

    for (const category of updatedCategories) {
      const fixed = this.processUrl(category.thumbnail, 'images');
      await this.prisma.coursesCategory.update({
        where: { id: category.id },
        data: { thumbnail: fixed },
      });
    }

    return {
      updatedLessons: updatedLessons.length,
      updatedCategories: updatedCategories.length,
    };
  }
}
