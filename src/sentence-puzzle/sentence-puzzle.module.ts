import { Module } from '@nestjs/common';
import { SentencePuzzleService } from './sentence-puzzle.service';
import { SentencePuzzleController } from './sentence-puzzle.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
   imports: [PrismaModule], 
  controllers: [SentencePuzzleController],
  providers: [SentencePuzzleService],
})
export class SentencePuzzleModule {}
