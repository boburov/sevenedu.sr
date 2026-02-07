import { Module } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CoursesController } from './courses.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadsModule } from '../uploads/uploads.module';
import { Category } from './application/create.category.usecase';
import { RemoveCategory } from './application/remove.category.usecase';
import { UpdateCategory } from './application/update-category.usecase';
import { UpdateLessonsBatch } from './application/update-lessons-batch.usecase';
import { UpdateLessonUsecase } from './application/update.lesson.usecase';
import { ReorderService } from './scripts/fix-lesson-orders';

@Module({
  imports: [PrismaModule, UploadsModule],
  controllers: [CoursesController],
  providers: [CoursesService, Category, RemoveCategory, UpdateCategory, UpdateLessonsBatch, UpdateLessonUsecase, ReorderService],
})
export class CoursesModule { }
