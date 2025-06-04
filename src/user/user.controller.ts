import { Body, Controller, Delete, Get, Headers, HttpException, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }

  // @UseGuards(JwtAuthGuard)
  @Get('all')
  async allUser() {
    return this.userService.allUser()
  }

  @UseGuards(JwtAuthGuard)
  @Patch('update/:id')
  @UseInterceptors(FileInterceptor('file'))
  UpdateUser(
    @UploadedFile() file: Express.Multer.File,
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.userService.updateUser(id, updateUserDto, file, 'images');
  }

  @Get('me')
  async getMe(@Headers('authorization') authHeader: string) {
    if (!authHeader) {
      throw new HttpException('Token yo‘q', 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const user = await this.userService.getUserIdFromToken(token);

    return { user };
  }

  @Get('by-email')
  async getUserByEmail(@Query('email') email: string) {
    if (!email) {
      throw new HttpException('Email kerak', 400);
    }

    const user = await this.userService.findByEmail(email);

    if (!user) {
      throw new HttpException('Foydalanuvchi topilmadi', 404);
    }

    return user;
  }
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteUser(@Param('id') id: string) {
    return this.userService.deleteUser(id)
  }

}
