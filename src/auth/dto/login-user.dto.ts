import { IsString } from "class-validator"

export class LoginUserDto {
  @IsString()
  name: string

  @IsString()
  email: string

  @IsString()
  password: string

  @IsString()
  phonenumber: string
}