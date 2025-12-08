import { Body, Controller, Delete, Get, Req, UseGuards, Post, HttpException, UnauthorizedException } from '@nestjs/common';
import { LoginUserDto } from './dto/login-user.dto';
import { AuthService } from './auth.service';
import { VerifyCodeDto } from './dto/verify-code';
import { CreateUserDto } from './dto/create-auth.dto';
import { JwtAuthGuard } from '../guard/jwt-auth.guard';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';
import { ForgotPasswordDto } from './dto/forgot-psw.dto';
import { JwtService } from '@nestjs/jwt';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private prisma: PrismaService,
    private jwt: JwtService
  ) { }

  @Post('register')
  async register(@Body() dto: CreateUserDto) {
    return this.authService.register(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('verify-token')
  verifyToken(@Req() req) {
    return {
      message: 'Token valid',
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
        courses: true,
        notifications: {
          include: {
            notification: true,
          },
        },
        showedLesson: true,
        notificationsRead: true,
      },
    });

    return user
  }

  @Post('refresh')
  async refresh(@Body('refreshToken') refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken);
      const newAccessToken = this.jwt.sign({ sub: payload.sub, email: payload.email }, { expiresIn: '15m' });
      return { accessToken: newAccessToken };
    } catch (err) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }


  @Post('verify')
  async verifyCode(@Body() verifyCode: VerifyCodeDto) {
    this.authService.incrementUserCoinByEmail(verifyCode.email);
    return this.authService.verify(verifyCode);
  }

  @Post('login')
  async login(@Body() login: LoginUserDto) {
    return this.authService.login(login);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return await this.authService.forgotPassword(body.email);
  }
}
