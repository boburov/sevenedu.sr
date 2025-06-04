import { Body, Controller, Delete, Get, HttpException, HttpStatus, Param, Patch, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CreateCategoryCourseDto } from './dto/create-course-category.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateLessonDto } from './dto/create-course.dot';
import { UpdateCategoryDto } from './dto/update-course.dto';

@Controller('courses')
export class CoursesController {
  constructor(private courseService: CoursesService) { }

  @Post('create')
  @UseInterceptors(FileInterceptor('file'))
  createCategory(
    @Body() dto: CreateCategoryCourseDto,
    @UploadedFile() file: Express.Multer.File
  ) {
    console.log('FILE:', file);
    return this.courseService.createCategory(dto, file);
  }

  @Post('category/:id/create-lesson')
  @UseInterceptors(FileInterceptor('video'))
  async createNewLesson(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: CreateLessonDto,
  ) {
    if (!file) throw new Error('Video file not provided');
    return this.courseService.createCourse(body, id, file);
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

  @Patch('category/:id')
  @UseInterceptors(FileInterceptor('file'))
  async update(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UpdateCategoryDto,
  ) {
    return this.courseService.updateCategory(id, body, file);
  }


  @Get('category/:id')
  async getCategory(@Param('id') id: string) {
    return this.courseService.getcategory(id)
  }

  @Get('all')
  async all() {
    return this.courseService.getAll()
  }
}
