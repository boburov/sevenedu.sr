import {
  Body,
  Controller,
  Post,
  UseGuards,
  Req,
  Get,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { ActivityService } from './activity.service';

@Controller('activity')
@UseGuards(JwtAuthGuard)
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Post('mark-viewed')
  markLessonViewed(@Req() req) {
    return this.activityService.markLessonViewed(req.user.id);
  }

  @Post('add-vocab-progress')
  addVocabularyProgress(@Req() req, @Body() body: { count: number }) {
    return this.activityService.addVocabularyProgress(req.user.id, body.count);
  }

  @Post('add-test-score')
  addTestScore(@Req() req, @Body() body: { score: number }) {
    return this.activityService.recordTestScore(req.user.id, body.score);
  }

  @Post('add-vocab-test-score')
  addVocabTestScore(@Req() req, @Body() body: { score: number }) {
    return this.activityService.recordVocabularyTestScore(req.user.id, body.score);
  }

  @Get('today')
  getTodayActivity(@Req() req) {
    return this.activityService.getTodayActivity(req.user.id);
  }
}
