import { IsNotEmpty, IsString } from "@nestjs/class-validator"

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
  
  @IsString()
  @IsNotEmpty()
  smsCode: string
}