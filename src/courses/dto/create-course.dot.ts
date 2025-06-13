import { Transform, Type } from "class-transformer"
import { IsBoolean, IsOptional, IsString } from "class-validator"

export class CreateLessonDto {
  @IsString()
  title: string

  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  isDemo: boolean

  @IsOptional()
  quzis?: []
}
