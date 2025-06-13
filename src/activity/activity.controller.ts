import { Body, Controller, Post } from '@nestjs/common';
import { ActivityService } from './activity.service';

@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) { }

  @Post('be-active')
  async be_active(@Body() dto: { userId: string, lessonId: string }) {
    return this.activityService.showedLessons(dto)
  }
}
