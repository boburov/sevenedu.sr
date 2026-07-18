import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateLessonDto } from './create-course.dot';

export class InsertLessonsDto {
  // null yoki bo'sh => ro'yxat boshiga qo'shiladi.
  // Aks holda shu ID li darsdan KEYIN qo'shiladi.
  @IsOptional()
  @IsString()
  afterLessonId?: string | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLessonDto)
  lessons: CreateLessonDto[];
}
