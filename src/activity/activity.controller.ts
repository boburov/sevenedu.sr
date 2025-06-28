import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { ActivityService } from './activity.service';

@Controller('lesson-activity')
@UseGuards(JwtAuthGuard)
export class ActivityController {
  constructor(private readonly service: ActivityService) {}

  @Post('mark')
  markLesson(@Req() req, @Body() body: {
    lessonId: string;
    courseId: string;
    vocabularyCorrect?: number;
    vocabularyWrong?: number;
    quizCorrect?: number;
    quizWrong?: number;
    score?: number;
  }) {
    return this.service.markLesson(req.user.id, body.lessonId, body.courseId, body);
  }

  @Get('all')
  getAll(@Req() req) {
    return this.service.getAllActivityByUser(req.user.id);
  }

  @Get('one')
  getOne(@Req() req, @Query('lessonId') lessonId: string) {
    return this.service.getLessonActivity(req.user.id, lessonId);
  }

  @Get('progress')
  getProgress(@Req() req, @Query('courseId') courseId: string) {
    return this.service.getProgressByCourse(req.user.id, courseId);
  }
}

