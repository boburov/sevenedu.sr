import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guard/jwt-auth.guard';
import { StreakService } from './streak.service';

@Controller('streak')
@UseGuards(JwtAuthGuard)
export class StreakController {
  constructor(private readonly streakService: StreakService) {}

  // GET /streak — joriy foydalanuvchining streak ma'lumoti
  @Get()
  getStreak(@Req() req: Request & { user: { id: string } }) {
    return this.streakService.getStreak(req.user.id);
  }
}
