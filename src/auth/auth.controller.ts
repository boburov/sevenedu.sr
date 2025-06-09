import { Body, Controller, Delete, Get, Req, UseGuards, Post, HttpException } from '@nestjs/common';
import { LoginUserDto } from './dto/login-user.dto';
import { AuthService } from './auth.service';
import { VerifyCodeDto } from './dto/verify-code';
import { CreateUserDto } from './dto/create-auth.dto';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private prisma: PrismaService
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
    const userId = req.user.id

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        notifications: {
          include: {
            notification: true,
          },
        },
        notificationsRead: true,
      },
    });

    return user
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
