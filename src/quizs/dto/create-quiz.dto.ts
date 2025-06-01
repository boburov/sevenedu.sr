import { IsArray, IsString } from "class-validator";

export class CreateQuizDto {
  @IsString()
  quession: string

  @IsString()
  option1: string

  @IsString()
  option2: string

  @IsString()
  option3: string

  @IsString()
  current: string
}
