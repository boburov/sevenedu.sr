import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CreateCategoryCourseDto } from './dto/create-course-category.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateLessonDto } from './dto/create-course.dot';
import { UpdateCategoryDto } from './dto/update-course.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { SaveVocabularyResultDto } from './dto/save-vocabulary-result.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('courses')
export class CoursesController {
  constructor(private courseService: CoursesService, private prisma: PrismaService) { }

  @Get('all')
  async all() {
    return this.courseService.getAll()
  }

  @Patch('fix-video-urls')
  async fixVideoUrls() {
    return this.courseService.fixAllVideoUrls();
  }

  @Patch('reorder')
  async reorderLessons() {
    return this.courseService.updateLessonOrdersByCategory();
  }


  @Get(':lessonId/vocabulary-quiz')
  async getVocabularyQuiz(@Param('lessonId') lessonId: string) {
    return this.courseService.generateVocabularyQuiz(lessonId);
  }

  @Get('category/:id')
  async getCategory(@Param('id') id: string) {
    return this.courseService.getcategory(id)
  }

  @Get('lessons/:id')
  async getLessonById(
    @Param('id') id: string,
  ) {
    return this.courseService.getLessonById(id);
  }


  @Post(':lessonId/vocabulary-result')
  @UseGuards(JwtAuthGuard)
  async saveVocabularyResult(
    @Param('lessonId') lessonId: string,
    @Body() body: SaveVocabularyResultDto,
    @Req() req,
  ) {
    const userId = req.user.id;
    await this.prisma.lessonActivity.upsert({
      where: {
        userId_lessonsId: {
          userId: userId,
          lessonsId: lessonId,
        },
      },
      update: {
        watchedAt: new Date(),
        vocabularyCorrect: body.correct,
        vocabularyWrong: body.wrong,
      },
      create: {
        userId: userId,
        lessonsId: lessonId,
        courseId: (await this.prisma.lessons.findUnique({ where: { id: lessonId } }))?.coursesCategoryId || "",
        watchedAt: new Date(),
        vocabularyCorrect: body.correct,
        vocabularyWrong: body.wrong,
      },
    });

    return this.courseService.saveVocabularyResult(lessonId, userId, body.correct, body.wrong);
  }

  @Post('create')
  @UseInterceptors(FileInterceptor('file'))
  createCategory(
    @Body() dto: CreateCategoryCourseDto,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Faqat rasm fayl yuklash mumkin');
    }

    return this.courseService.createCategory(dto, file);
  }

  @Post('category/:id/lesson')
  @UseInterceptors(FileInterceptor('video'))
  async createNewLesson(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: CreateLessonDto,
  ) {
    if (!file) throw new Error('Video file not provided');
    return this.courseService.createCourse(body, id, file);
  }

  @Patch('category/:id')
  @UseInterceptors(FileInterceptor('file'))
  async update(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UpdateCategoryDto,
  ) {
    return this.courseService.updateCategory(id, body, file);
  }

  @Patch('lessons/:id')
  @UseInterceptors(FileInterceptor('video'))
  async updateLesson(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {

    if (typeof body.isDemo === 'string') {
      body.isDemo = body.isDemo === 'true';
    }


    const dto: UpdateLessonDto = {
      title: body.title,
      videoUrl: body.videoUrl,
      isDemo: body.isDemo,
    };

    return this.courseService.updateLesson(id, dto, file);
  }

  @Delete("lesson/:id")
  async deleteLEsson(@Param('id') id: string) {
    return this.courseService.deleteLesson(id)
  }

  @Delete(':id')
  async deleteCategory(@Param('id') id: string, @Res() res: Response) {
    try {
      await this.courseService.removeCategory(id);
      return { message: 'Kategoriya va rasm o‘chirildi' }
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
