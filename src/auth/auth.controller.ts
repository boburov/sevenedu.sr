import { Body, Controller, Post } from '@nestjs/common';
import { LoginUserDto } from './dto/login-user.dto';
import { CreateUserDto } from './dto/create-auth.dto';
import { AuthService } from './auth.service';
import { VerifyCodeDto } from './dto/verify-code';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
  ) { }

  @Post('register')
  async register(@Body() register: CreateUserDto) {
    return this.authService.createUser(register)
  }

  @Post('verify')
  async verifyCode(@Body() verifyCode: VerifyCodeDto) {
    const result = await this.authService.verifyCode(verifyCode);
    return result;
  }

  @Post('login')
  async login(@Body() login: LoginUserDto) {
    return this.authService.login(login)
  }
}
