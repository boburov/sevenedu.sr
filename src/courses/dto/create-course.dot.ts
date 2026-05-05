import { Transform } from "class-transformer"
import { IsBoolean, IsOptional, IsString } from "class-validator"

export class CreateLessonDto {
  @IsString()
  title: string

  @IsString()
  videoUrl: string

  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value;  // ← bu qator yo'q edi!
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  isDemo: boolean

  @IsOptional()
  quzis?: []
}
