import { Body, Controller, Param, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { LoginUserDto } from './dto/login-user.dto';
import { AuthService } from './auth.service';
import { VerifyCodeDto } from './dto/verify-code';
import { createUserByEmail } from './dto/create-by-email.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { UpdateUserDto } from 'src/user/dto/update-user.dto';
import { UserService } from 'src/user/user.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
  ) { }

  @Post('signup')
  async register(@Body() dto: createUserByEmail) {
    return this.authService.createUserByEmail(dto)
  }

  @Post('verify')
  async verifyCode(@Body() verifyCode: VerifyCodeDto) {
    const result = await this.authService.verifyCode(verifyCode);
    return result;
  }

  @Patch('update/:id')
  @UseInterceptors(FileInterceptor('file'))
  UpdateUser(
    @UploadedFile() file: Express.Multer.File,
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.authService.updateUser(id, updateUserDto, file, 'images');
  }


  @Post('login')
  async login(@Body() login: LoginUserDto) {
    return this.authService.login(login)
  }
}
