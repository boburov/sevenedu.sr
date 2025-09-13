import { Module } from '@nestjs/common';
import { SentencePuzzleService } from './sentence-puzzle.service';
import { SentencePuzzleController } from './sentence-puzzle.controller';

@Module({
  controllers: [SentencePuzzleController],
  providers: [SentencePuzzleService],
})
export class SentencePuzzleModule {}
