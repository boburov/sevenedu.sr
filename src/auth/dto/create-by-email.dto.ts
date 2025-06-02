import { IsString } from "class-validator"

export class createUserByEmail {
  @IsString()
  email: string

  @IsString()
  password: string
}