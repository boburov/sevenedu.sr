import { Transform } from "class-transformer"
import { IsBoolean, IsOptional, IsString } from "class-validator"

export class CreateLessonDto {
  @IsString()
  title: string

  @IsString()
  videoUrl: string

  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value; // boolean kelsa o'zini qaytaradi
  })
  isDemo: boolean

  @IsOptional()
  quzis?: []
}
