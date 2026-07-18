import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

/**
 * Admin brauzeridan Vimeo'ga to'g'ridan-to'g'ri (tus) yuklash uchun
 * upload ticket so'rovi. `size` — tanlangan faylning aniq hajmi (bayt).
 */
export class CreateUploadTicketDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  size: number;

  @IsOptional()
  @IsString()
  name?: string;
}
