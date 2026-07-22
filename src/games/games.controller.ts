import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { GamesService } from './games.service';
import { RewardDto } from './dto/reward.dto';
import { JwtAuthGuard } from '../guard/jwt-auth.guard';

@Controller('games')
export class GamesController {
  constructor(private readonly games: GamesService) {}

  /**
   * Mobil o'yinlar uchun tasodifiy so'zlar (Word Memory / So'z o'yini).
   * `courseId` berilsa — so'zlar faqat o'sha kursning lug'atidan olinadi.
   */
  @UseGuards(JwtAuthGuard)
  @Get('words')
  words(@Query('count') count?: string, @Query('courseId') courseId?: string) {
    return this.games.getWords(Number(count) || 6, courseId || undefined);
  }

  /** O'yin yakunida coins mukofoti (server authoritative, cap bilan). */
  @UseGuards(JwtAuthGuard)
  @Post('reward')
  reward(@Body() dto: RewardDto, @Req() req) {
    return this.games.reward(req.user.id, dto.game, dto.score);
  }
}
