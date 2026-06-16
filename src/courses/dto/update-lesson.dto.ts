import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { CEFR_LEVELS } from './create-course.dot';

export class UpdateLessonDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsBoolean()
  isDemo?: boolean;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @IsOptional()
  @IsString()
  videoUrl?: string;

  @IsOptional()
  @IsString()
  @IsIn(CEFR_LEVELS as unknown as string[])
  level?: string;
}
