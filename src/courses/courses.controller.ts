import {
  BadRequestException,
  Controller,
  Body,
  Delete,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CreateCategoryCourseDto } from './dto/create-course-category.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateLessonDto } from './dto/create-course.dot';
import { UpdateCategoryDto } from './dto/update-course.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { SaveVocabularyResultDto } from './dto/save-vocabulary-result.dto';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../guard/jwt-auth.guard';
import { UpdateLessonsBatchDto } from './dto/update.dto';
import { Category } from './application/create.category.usecase';
import { RemoveCategory } from './application/remove.category.usecase';
import { UpdateCategory } from './application/update-category.usecase';
import { UpdateLessonsBatch } from './application/update-lessons-batch.usecase';
import { UpdateLessonUsecase } from './application/update.lesson.usecase';
import { ReorderService } from './scripts/fix-lesson-orders';

@Controller('courses')
export class CoursesController {
  constructor(
    private courseService: CoursesService,
    private prisma: PrismaService,
    private category: Category,
    private removeCategory: RemoveCategory,
    private updateCategory: UpdateCategory,
    private updateLessonBatch: UpdateLessonsBatch,
    private updateLessonUsecase: UpdateLessonUsecase,
    private reorder: ReorderService
  ) { }

  // GET All Courses
  @Get('all')
  async all() {
    return this.courseService.getAll();
  }

  // DELETE all invinsible lessons
  @Delete('delete/all/invisible-lessons')
  @HttpCode(HttpStatus.OK)
  async deleteAllInvisibleLessons() {
    return this.courseService.deleteAllInvisibleLessons();
  }

  // Vocabulary Section
  // Get Vocabulary By Lesson ID
  @Get(':lessonId/vocabulary-quiz')
  async getVocabularyQuiz(@Param('lessonId') lessonId: string) {
    return this.courseService.generateVocabularyQuiz(lessonId);
  }

  // POST Vocabulary from getting user
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
        courseId:
          (await this.prisma.lessons.findUnique({ where: { id: lessonId } }))
            ?.coursesCategoryId || '',
        watchedAt: new Date(),
        vocabularyCorrect: body.correct,
        vocabularyWrong: body.wrong,
      },
    });

    return this.courseService.saveVocabularyResult(
      lessonId,
      userId,
      body.correct,
      body.wrong,
    );
  }

  // Category Section
  // this is a create category section
  @Post('create')
  @UseInterceptors(FileInterceptor('file'))
  createCategory(
    @Body() dto: CreateCategoryCourseDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Faqat rasm fayl yuklash mumkin');
    }

    return this.category.create(dto, file);
  }

  // get category by ID
  @Get('category/:id')
  async getCategory(@Param('id') id: string) {
    return this.category.getcategory(id);
  }

  // delete category
  @Delete(':id')
  async deleteCategory(@Param('id') id: string, @Res() res: Response) {
    try {
      await this.removeCategory.remove(id);
      return { message: 'Kategoriya va rasm o‘chirildi' };
    } catch (err) {
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // edit category
  @Patch('category/:id')
  @UseInterceptors(FileInterceptor('file'))
  async update(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UpdateCategoryDto,
  ) {
    return this.updateCategory.update(id, body, file);
  }
  // end of category endpoint

  // Lessons Section
  // create lesson section 
  @Post(':id/lesson')
  @UseInterceptors(FileInterceptor('video'))
  async createNewLesson(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: CreateLessonDto,
  ) {
    if (!file) throw new Error('Video file not provided');
    return this.courseService.createCourse(body, id, file);
  }

  // Get Lessons By ID
  @Get('lessons/:id')
  async getLessonById(@Param('id') id: string) {
    return this.category.getLessonById(id);
  }

  // edit lessons
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

    return this.updateLessonUsecase.update(id, dto, file);
  }

  // delete lesson
  @Patch('lesson/:id')
  async deleteLEsson(@Param('id') id: string) {
    return this.courseService.deleteLesson(id);
  }

  // esimdan chiqib qoldi nima ekanligi
  @Patch('lessons/batch')
  async updateLessonsBatch(@Body() body: UpdateLessonsBatchDto) {
    return this.updateLessonBatch.update(body);
  }

  //  reorder lessons
  @Put(':categoryId/reorder-lessons')
  async reorderLessons(
    @Param('categoryId') categoryId: string,
    @Body()
    reorderData:
      | { lessonId: string; newIndex: number }
      | Array<{ lessonId: string; newIndex: number }>,
  ) {
    return this.reorder.lessons(categoryId, reorderData);
  }

}
