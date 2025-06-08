import { Body, Controller, Delete, Get, Req, UseGuards, Post, HttpException } from '@nestjs/common';
import { LoginUserDto } from './dto/login-user.dto';
import { AuthService } from './auth.service';
import { VerifyCodeDto } from './dto/verify-code';
import { CreateUserDto } from './dto/create-auth.dto';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
  ) { }

  @Post('register')
  async register(@Body() dto: CreateUserDto) {
    return this.authService.register(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('verify-token')
  verifyToken(@Req() req) {
    return {
      message: 'Token valid ✅',
      user: req.user,
    };
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  async getMe(@Req() req) {
    return req.user;
  }

  @Post('verify')
  async verifyCode(@Body() verifyCode: VerifyCodeDto) {
    return this.authService.verify(verifyCode);
  }

  @Post('login')
  async login(@Body() login: LoginUserDto) {
    return this.authService.login(login);
  }

  @Delete('all')
  async deleteAll() {
    return this.authService.deleteAllUsers();
  }
}
