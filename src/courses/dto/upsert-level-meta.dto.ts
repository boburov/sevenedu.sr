import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CEFR_LEVELS } from './create-course.dot';

// Bitta kurs darajasining (moduli) nomini/tavsifini saqlash/yangilash.
export class UpsertLevelMetaDto {
  @IsIn(CEFR_LEVELS as unknown as string[])
  level: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsInt()
  order?: number;
}
