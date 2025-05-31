import { IsEmail, IsOptional, IsString } from "class-validator"

export class UpdateUserDto {

  @IsOptional()
  @IsString()
  name: string

  @IsOptional()
  @IsString()
  surname: string

  @IsOptional()
  @IsString()
  phonenumber: string

  @IsOptional()
  @IsString()
  profilePic: string

  @IsOptional()
  @IsString()
  @IsEmail()
  email: string

  @IsOptional()
  @IsString()
  password: string
}