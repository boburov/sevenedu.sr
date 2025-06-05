import { Type } from "class-transformer"
import { IsBoolean, IsOptional, IsString } from "class-validator"

export class CreateLessonDto {
  @IsString()
  title: string

  @IsBoolean()
  @Type(() => Boolean)
  isDemo: boolean
  @IsOptional()
  quzis?: []
}
