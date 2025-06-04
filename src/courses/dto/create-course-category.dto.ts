import { IsArray, IsOptional, IsString } from "class-validator"

export class CreateCategoryCourseDto {
  @IsString()
  title: string

  @IsString()
  goal: string

  @IsString()
  shortName: string

  @IsArray()
  @IsOptional()
  lessons: []
}
