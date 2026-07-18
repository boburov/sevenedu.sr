import {
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateMovieDto {
  @IsString()
  @IsNotEmpty()
  courseId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  // Vimeo (yoki MP4) havolasi.
  @IsString()
  @IsNotEmpty()
  videoUrl: string;

  @IsOptional()
  @IsString()
  description?: string;

  // multipart → string keladi.
  @IsOptional()
  @IsNumberString()
  order?: string;
}
