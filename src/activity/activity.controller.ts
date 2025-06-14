import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ActivityService } from './activity.service';

@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) { }

  @Get('daily/:userId')
  async getDailyActivity(@Param('userId') userId: string) {
    return this.activityService.getUserDailyActivity(userId);
  }

  @Post('be-active')
  async be_active(@Body() dto: { userId: string, lessonId: string }) {
    return this.activityService.showedLessons(dto)
  }

  @Post('update')
  async updateLessonActivityStats(@Body() dto: {
    userId: string,
    lessonsId: string,
    vocabularyCorrect: number,
    vocabularyWrong: number,
    quizCorrect: number,
    quizWrong: number,
    score: number
  }) {
    return this.activityService.updateLessonActivityStats(dto)
  }
  
}