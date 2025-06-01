import { IsArray, IsString } from "class-validator"

export class CreateCategoryCourseDto {
  @IsString()
  title: string

  @IsString()
  goal: string

  @IsString()
  shortName: string

  @IsArray()
  lessons: []

  @IsString()
  thumbnail: string
}
