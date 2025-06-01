import { HttpException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCategoryCourseDto } from './dto/create-course-category.dto';
import { UploadsService } from 'src/uploads/uploads.service';
import { CreateLessonDto } from './dto/create-course.dot';

@Injectable()
export class CoursesService {
  constructor(
    private prisma: PrismaService,
    private uploadsService: UploadsService
  ) { }

  async createCategory(createCategory: CreateCategoryCourseDto, file: Express.Multer.File) {
    const { title, shortName, goal, lessons } = createCategory;

    const course = await this.prisma.coursesCategory.findFirst({ where: { shortName } });
    if (course) throw new HttpException('This Course Already Exists', 400);

    const newFileUrl = await this.uploadsService.uploadFile(file, 'images');

    const newCourseCategory = await this.prisma.coursesCategory.create({
      data: {
        title,
        goal,
        shortName,
        thumbnail: newFileUrl,
        lessons: {
          create: []
        }
      },
    });

    return newCourseCategory;
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

  async getcategory(id: string) {
    const get = this.prisma.coursesCategory.findFirst({ where: { id } })
    return get
  }

  async getAll() {
    const course = await this.prisma.coursesCategory.findMany({
      include: {
        lessons: true
      }
    })
    return course
  }
}
