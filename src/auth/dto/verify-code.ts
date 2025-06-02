import { IsString } from "class-validator"

export class VerifyCodeDto {
  @IsString()
  email: string

  @IsString()
  code: string
}