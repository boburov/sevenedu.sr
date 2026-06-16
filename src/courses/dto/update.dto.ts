import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  ValidateNested,
} from 'class-validator';
import { CEFR_LEVELS } from './create-course.dot';

export class UpdateLessonBatchItemDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsBoolean()
  isDemo?: boolean;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @IsOptional()
  @IsUrl()
  videoUrl?: string;

  @IsOptional()
  @IsString()
  @IsIn(CEFR_LEVELS as unknown as string[])
  level?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  order?: number;
}

export class UpdateLessonsBatchDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateLessonBatchItemDto)
  updates: UpdateLessonBatchItemDto[];
}
