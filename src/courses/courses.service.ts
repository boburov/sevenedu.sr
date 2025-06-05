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

  // get request
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


  // create request
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

  async createCourse(createCourse: CreateLessonDto, id: string, file: Express.Multer.File) {
    const { title, isDemo, } = createCourse;

    const category = await this.prisma.coursesCategory.findUnique({ where: { id } });
    if (!category) throw new HttpException(`Category Not Found`, 404);

    const videoFileUrl = await this.uploadsService.uploadFile(file, 'videos');

    const newCourse = await this.prisma.lessons.create({
      data: {
        title,
        isDemo,
        videoUrl: videoFileUrl,
        coursesCategoryId: id
      }
    });

    return newCourse;
  }

  // update request
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


  //delete request 
  async deleteLesson(id: string) {
    const lesson = await this.prisma.lessons.delete({ where: { id } })
    this.uploadService.deleteFile(lesson.videoUrl)
    return { msg: "lesson deleted" }
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
