import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { LoginUserDto } from './dto/login-user.dto';
import { CreateUserDto } from './dto/create-auth.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Post('register')
  async register(@Body() register: CreateUserDto) {
    return this.authService.createUser(register)
  }

  @Get('')
  async allUser() {
    return this.authService.allUser()
  }

  @Delete(':id')
  async deleteUser(@Param('id') id: string) {
    return this.authService.deleteUser(id)
  }

  // @UseGuards(JwtAuthGuard)
  @Post('login')
  async login(@Body() login: LoginUserDto) {

  }
}
