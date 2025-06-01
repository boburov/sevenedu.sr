import { Module } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CoursesController } from './courses.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UploadsModule } from 'src/uploads/uploads.module';

@Module({
  imports: [PrismaModule, UploadsModule],
  controllers: [CoursesController],
  providers: [CoursesService],
})
export class CoursesModule { }
