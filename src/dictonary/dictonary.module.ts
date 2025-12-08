import { Module } from '@nestjs/common';
import { DictonaryService } from './dictonary.service';
import { DictonaryController } from './dictonary.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DictonaryController],
  providers: [DictonaryService],
})
export class DictonaryModule { }
