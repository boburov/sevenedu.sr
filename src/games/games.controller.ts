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

  /** Mobil o'yinlar uchun tasodifiy so'zlar (Word Memory / So'z o'yini). */
  @UseGuards(JwtAuthGuard)
  @Get('words')
  words(@Query('count') count?: string) {
    return this.games.getWords(Number(count) || 6);
  }

  /** O'yin yakunida coins mukofoti (server authoritative, cap bilan). */
  @UseGuards(JwtAuthGuard)
  @Post('reward')
  reward(@Body() dto: RewardDto, @Req() req) {
    return this.games.reward(req.user.id, dto.game, dto.score);
  }
}
