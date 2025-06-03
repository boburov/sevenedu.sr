import { Body, Controller, Delete, Post } from '@nestjs/common';
import { LoginUserDto } from './dto/login-user.dto';
import { AuthService } from './auth.service';
import { VerifyCodeDto } from './dto/verify-code';
import { CreateUserDto } from './dto/create-auth.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
  ) { }

  @Post('register')
  async register(@Body() dto: CreateUserDto) {
    return this.authService.register(dto)
  }

  @Post('verify')
  async verifyCode(@Body() verifyCode: VerifyCodeDto) {
    const result = await this.authService.verify(verifyCode);
    return result;
  }

  @Post('login')
  async login(@Body() login: LoginUserDto) {
    return this.authService.login(login)
  }

  @Delete('all')
  async deleteAll() {
    this.authService.deleteAllUsers()
  }
}
