import {
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @Length(3, 50, { message: 'Title 3-50 ta belgidan iborat bo‘lishi kerak' })
  @Matches(/^[a-zA-Z0-9\s\-_.]+$/, {
    message: 'Title faqat harflar, raqamlar va - _ . bo‘lishi mumkin',
  })
  @Transform(({ value }) => value?.trim())
  title?: string;

  @IsOptional()
  @IsString()
  @Length(10, 500, { message: 'Goal 10-500 ta belgidan iborat bo‘lishi kerak' })
  @Transform(({ value }) => value?.trim())
  goal?: string;

  @IsOptional()
  @IsString()
  @Length(2, 30, { message: 'Short name 2-30 ta belgidan iborat bo‘lishi kerak' })
  @Matches(/^[a-zA-Z0-9\-_]+$/, {
    message: 'Short name faqat harflar, raqamlar, - va _ bo‘lishi mumkin',
  })
  @Transform(({ value }) => value?.trim().toLowerCase())
  shortName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\/uploads\/[a-zA-Z0-9_.-]+\.(jpg|jpeg|png|webp)$/, {
    message: 'Thumbnail noto‘g‘ri formatda',
  })
  thumbnail?: string;
}
