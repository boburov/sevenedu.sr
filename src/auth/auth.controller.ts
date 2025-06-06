import { Body, Controller, Delete, Get, Headers, HttpException, Post, Req, UseGuards } from '@nestjs/common';
import { LoginUserDto } from './dto/login-user.dto';
import { AuthService } from './auth.service';
import { VerifyCodeDto } from './dto/verify-code';
import { CreateUserDto } from './dto/create-auth.dto';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { AuthGuard } from '@nestjs/passport';
import { UserService } from 'src/user/user.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private userService: UserService
  ) { }

  @Post('register')
  async register(@Body() dto: CreateUserDto) {
    return this.authService.register(dto)
  }
  @UseGuards(JwtAuthGuard)
  @Get('verify-token')
  verifyToken(@Req() req) {
    return {
      message: 'Token valid ✅',
      user: req.user,
    };
  }

  @UseGuards(AuthGuard("jwt"))
  @Get('me')
  async getMe(@Req() req) {
    const userId = req.user.userId; // JWT dan keladi
    return this.userService.getUserById(userId);
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
