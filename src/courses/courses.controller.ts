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
import { AdminAuthGuard } from '../guard/admin-auth.guard';
import { PermissionsGuard } from '../guard/permissions.guard';
import { RequirePermission } from '../guard/require-permission.decorator';
import { InsertLessonsDto } from './dto/insert-lessons.dto';
import { UpdateLessonsBatchDto } from './dto/update.dto';
import { Category } from './application/create.category.usecase';
import { RemoveCategory } from './application/remove.category.usecase';
import { UpdateCategory } from './application/update-category.usecase';
import { UpdateLessonsBatch } from './application/update-lessons-batch.usecase';
import { UpdateLessonUsecase } from './application/update.lesson.usecase';
import { GetLessonDownload } from './application/get-download.usecase';
import { ReorderService } from './scripts/fix-lesson-orders';
import { FixVideoUrlsDto } from './dto/video-url-fixed.dto';
import { CreateLessonsBatchDto } from './dto/create-lesson-batch.dto';
import { UpsertLevelMetaDto } from './dto/upsert-level-meta.dto';
import { CreateUploadTicketDto } from './dto/create-upload-ticket.dto';
import { VimeoService } from '../vimeo/vimeo.service';

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
    private getLessonDownload: GetLessonDownload,
    private reorder: ReorderService,
    private vimeo: VimeoService,
  ) { }

  // GET All Courses
  @Get('all')
  async all() {
    return this.courseService.getAll();
  }

  // Joriy foydalanuvchining har kurs bo'yicha tugatgan darslari foizi
  @UseGuards(JwtAuthGuard)
  @Get('my-progress')
  async myProgress(@Req() req) {
    return this.courseService.getMyProgress(req.user.id);
  }

@Post(':id/lessons/batch')
@UseGuards(AdminAuthGuard, PermissionsGuard)
@RequirePermission('lessons.create')
async createLessonsBatch(
  @Param('id') id: string,
  @Body() body: CreateLessonsBatchDto,
) {
  return this.courseService.createLessonsBatch(body.lessons, id);
}

  // Darslarni ikki dars orasiga (yoki boshiga) qo'shish
  @Post(':id/lessons/insert')
  @UseGuards(AdminAuthGuard, PermissionsGuard)
  @RequirePermission('lessons.create')
  async insertLessons(
    @Param('id') id: string,
    @Body() body: InsertLessonsDto,
  ) {
    return this.courseService.insertLessons(id, body.afterLessonId, body.lessons);
  }

  @Patch('category/:id/thumbnail')
  @UseGuards(AdminAuthGuard, PermissionsGuard)
  @RequirePermission('courses.edit')
  async updateThumbnail(
    @Param('id') id: string,
    @Body() body: { thumbnail: string },
  ) {
    if (!body.thumbnail) {
      throw new BadRequestException('thumbnail majburiy ❌');
    }

    return this.courseService.updateCategoryThumbnail(id, body.thumbnail);
  }

  //   all invinsible lessons
  @Delete('delete/all/invisible-lessons')
  @UseGuards(AdminAuthGuard, PermissionsGuard)
  @RequirePermission('lessons.delete')
  @HttpCode(HttpStatus.OK)
  async deleteAllInvisibleLessons() {
    return this.courseService.deleteAllInvisibleLessons();
  }

  // courses.controller.ts
  @Patch('lessons/batch-delete')
  @UseGuards(AdminAuthGuard, PermissionsGuard)
  @RequirePermission('lessons.delete')
  @HttpCode(HttpStatus.OK)
  async batchDeleteLessons(@Body() body: { lessonIds: string[] }) {
    if (!Array.isArray(body.lessonIds) || body.lessonIds.length === 0) {
      throw new BadRequestException('lessonIds array bo‘lishi kerak va bo‘sh bo‘lmasligi kerak');
    }

    if (body.lessonIds.length > 100) {
      throw new BadRequestException('Bir martada maksimal 100 ta dars o‘chirilishi mumkin');
    }

    return this.courseService.batchDeleteLessons(body.lessonIds);
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
  @UseGuards(AdminAuthGuard, PermissionsGuard)
  @RequirePermission('courses.create')
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

  // ── CEFR daraja (modul) meta ─────────────────────────────
  // Kursning daraja nomlari/tavsiflari (mobile + admin o'qiydi)
  @Get(':id/levels')
  async getCourseLevels(@Param('id') id: string) {
    return this.courseService.getCourseLevels(id);
  }

  // Bir darajaning nom/tavsifini saqlash (admin)
  @Put(':id/levels')
  @UseGuards(AdminAuthGuard, PermissionsGuard)
  @RequirePermission('courses.edit')
  async upsertCourseLevel(
    @Param('id') id: string,
    @Body() body: UpsertLevelMetaDto,
  ) {
    return this.courseService.upsertCourseLevel(id, body);
  }

  // Daraja metasini o'chirish (admin)
  @Delete(':id/levels/:level')
  @UseGuards(AdminAuthGuard, PermissionsGuard)
  @RequirePermission('courses.edit')
  async deleteCourseLevel(
    @Param('id') id: string,
    @Param('level') level: string,
  ) {
    return this.courseService.deleteCourseLevel(id, level);
  }

  // delete category
  @Delete(':id')
  @UseGuards(AdminAuthGuard, PermissionsGuard)
  @RequirePermission('courses.delete')
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
  @UseGuards(AdminAuthGuard, PermissionsGuard)
  @RequirePermission('courses.edit')
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
  // Vimeo'ga to'g'ridan-to'g'ri (brauzerdan) yuklash uchun tus upload ticket ochadi.
  // Fayl serverdan o'tmaydi — admin brauzeri qaytgan uploadLink'ka yuklaydi,
  // so'ng natijaviy videoUrl bilan oddiy dars yaratiladi.
  @Post('vimeo/upload-ticket')
  @UseGuards(AdminAuthGuard, PermissionsGuard)
  @RequirePermission('lessons.create')
  async createVimeoUploadTicket(@Body() body: CreateUploadTicketDto) {
    return this.vimeo.createUploadTicket(body.size, body.name);
  }

  // create lesson section
  @Post(':id/lesson')
  @UseGuards(AdminAuthGuard, PermissionsGuard)
  @RequirePermission('lessons.create')
  async createNewLesson(
    @Param('id') id: string,
    @Body() body: CreateLessonDto,
  ) {
    return this.courseService.createCourse(body, id);
  }

  // Get Lessons By ID
  @Get('lessons/:id')
  async getLessonById(@Param('id') id: string) {
    return this.category.getLessonById(id);
  }

  // Offline yuklab olish uchun progressive video linki (auth + enrollment)
  @Get('lessons/:id/download')
  @UseGuards(JwtAuthGuard)
  async getLessonDownloadLink(@Param('id') id: string, @Req() req) {
    return this.getLessonDownload.execute(id, req.user);
  }

  // edit lessons
  @Patch('lessons/:id')
  @UseGuards(AdminAuthGuard, PermissionsGuard)
  @RequirePermission('lessons.edit')
  @UseInterceptors(FileInterceptor('video'))
  async updateLesson(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    if (typeof body.isDemo === 'string') {
      body.isDemo = body.isDemo === 'true';
    }
    if (typeof body.isVisible === 'string') {
      body.isVisible = body.isVisible === 'true';
    }

    const dto: UpdateLessonDto = {
      title: body.title,
      videoUrl: body.videoUrl,
      isDemo: body.isDemo,
      isVisible: body.isVisible,
    };

    return this.updateLessonUsecase.update(id, dto, file);
  }

  // delete lesson
  @Patch('lesson/:id')
  @UseGuards(AdminAuthGuard, PermissionsGuard)
  @RequirePermission('lessons.delete')
  async deleteLEsson(@Param('id') id: string) {
    return this.courseService.deleteLesson(id);
  }

  // esimdan chiqib qoldi nima ekanligi
  @Patch('lessons/batch')
  @UseGuards(AdminAuthGuard, PermissionsGuard)
  @RequirePermission('lessons.edit')
  async updateLessonsBatch(@Body() body: UpdateLessonsBatchDto) {
    return this.updateLessonBatch.update(body);
  }

  // fix video url
  @Post('fix/video-urls')
  @UseGuards(AdminAuthGuard, PermissionsGuard)
  @RequirePermission('lessons.edit')
  async fixVideoUrls(@Body() body: any) {
    console.log('BODY:', body); // DEBUG

    // 2 xil formatni ham qabul qiladi
    const data = Array.isArray(body) ? body : body.data;

    return this.courseService.fixAllVideoUrls(data);
  }

  //  reorder lessons
  @Put(':categoryId/reorder-lessons')
  @UseGuards(AdminAuthGuard, PermissionsGuard)
  @RequirePermission('lessons.edit')
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
