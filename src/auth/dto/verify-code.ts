import { IsString } from "class-validator"

export class VerifyCodeDto {
  @IsString()
  token: string

  @IsString()
  code: string
}