import { Body, Controller, Delete, Get, Param, Patch, Query, Req, UploadedFile, UseGuards, UseInterceptors, HttpException, Post } from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Get('all')
  async allUser() {
    return this.userService.allUser();
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


  @Get(':id')
  async getUserById(@Param('id') id: string) {
    return this.userService.getUserById(id);
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

  @Post('updateProfilePic/:id')
  @UseInterceptors(FileInterceptor('profilePic'))
  updateProfilePic(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.userService.updateProfilePic(id, file);
  }

  @Delete('deleteProfilePic/:id')
  async deleteProfilePic(@Param('id') id: string) {
    return this.userService.deleteProfilePic(id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteUser(@Param('id') id: string) {
    return this.userService.deleteUser(id);
  }
}
