import { IsNotEmpty, IsString } from "class-validator";

export class CreateQuessionDto {
  @IsString()
  @IsNotEmpty()
  quession: string
}
