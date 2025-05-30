import { IsEmail, IsNotEmpty, IsString, Min, MinLength } from "@nestjs/class-validator"

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name: string

  @IsString()
  @IsNotEmpty()
  surname: string

  @IsString()
  @IsNotEmpty()
  phonenumber: string

  @IsEmail()
  @IsString()
  @IsNotEmpty()
  email: string

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string

  @IsString()
  @IsNotEmpty()
  smsCode: string
}