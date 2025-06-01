import { IsString } from "class-validator";

export class CreateDictonaryDto {
  @IsString()
  word: string

  @IsString()
  translated: string
}
