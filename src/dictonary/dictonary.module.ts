import { Module } from '@nestjs/common';
import { DictonaryService } from './dictonary.service';
import { DictonaryController } from './dictonary.controller';

@Module({
  controllers: [DictonaryController],
  providers: [DictonaryService],
})
export class DictonaryModule {}
