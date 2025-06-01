import { Module } from '@nestjs/common';
import { QuessionsService } from './quessions.service';
import { QuessionsController } from './quessions.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [QuessionsController],
  providers: [QuessionsService],
})
export class QuessionsModule { }
