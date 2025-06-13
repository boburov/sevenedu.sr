import { Body, Controller, Delete, Get, Param, Patch, Query, Req, UploadedFile, UseGuards, UseInterceptors, HttpException, Post, NotFoundException, BadRequestException } from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService, private prisma: PrismaService) { }

  @Get('all')
  async allUser() {
    return this.userService.allUser();
  }

  @Get('check')
  async checkEmail(@Query('email') email: string) {
    if (!email) {
      throw new BadRequestException('Email kiritilmagan');
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (user) {
      throw new HttpException('Bu email allaqachon ishlatilmoqda', 400);
    }

    return { available: true };
  }


  @Get('by-email')
  async getUserByEmail(@Query('email') email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Bunday email topilmadi');
    }

    return user;
  }

  @Post('chat')
  async chatWithAI(@Body() body: { lessonId: string; message: string }, @Req() req): Promise<{ answer: string }> {
    const userId = req.user.id;
    const answer = await this.userService.chatWithAI(userId, body.lessonId, body.message);
    return { answer };
  }

  @Get('ai-usage')
  async getUsage(
    @Query('userId') userId: string,
    @Query('lessonId') lessonId: string,
  ) {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));

    const usage = await this.prisma.lessonAIUsage.findFirst({
      where: {
        userId,
        lessonId,
        date: { gte: startOfDay },
      },
    });

    return { count: usage?.count || 0 };
  }



  @Get(':id')
  async getUserById(@Param('id') id: string) {
    return this.userService.getUserById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('update/:id')
  @UseInterceptors(FileInterceptor('file'))
  async UpdateUser(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {

    return this.userService.updateUser(id, updateUserDto,);
  }

  @Post('assign-course')
  async assignCourseToUser(
    @Body() body: { email: string; courseId: string }
  ) {
    return this.userService.assignCourse(body.email, body.courseId);
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

  @Delete('all')
  async deleteUser() {
    return this.userService.deleteUser();
  }




}