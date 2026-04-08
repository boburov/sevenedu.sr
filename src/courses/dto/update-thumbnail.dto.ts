import { IsString } from 'class-validator';

export class UpdateThumbnailDto {
  @IsString()
  thumbnail: string;
}