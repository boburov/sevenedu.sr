import { BadRequestException, Body, Controller, Get, Param, Post, UploadedFile, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { UpdateUserDto } from 'src/user/dto/update-user.dto';
import { CoursesService } from './courses.service';
import { CreateCategoryCourseDto } from './dto/create-course-category.dto';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { CreateLessonDto } from './dto/create-course.dot';

@Controller('courses')
export class CoursesController {
  constructor(private courseService: CoursesService) { }

  @Post('new-category')
  @UseInterceptors(FileInterceptor('file'))
  async CreateCourseCategory(
    @Body() dto: CreateCategoryCourseDto,
    @UploadedFile() file: Express.Multer.File,) {
    if (!file) {
      throw new Error('File not provided');
    }
    return this.courseService.createCategory(dto, file)

  }

  @Post('category/:id/newlesson')
  @UseInterceptors(FileInterceptor('video'))
  async createNewLesson(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: CreateLessonDto,
  ) {
    if (!file) throw new Error('Video file not provided');
    return this.courseService.createCourse(body, id, file);
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
