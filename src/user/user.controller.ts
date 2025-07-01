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

  @UseGuards(JwtAuthGuard)
  @Get("user-progress")
  async getUserProgress(@Req() req) {
    const userId = req.user.id;
    return this.userService.getUserProgress(userId);
  }

  @Get(':id/lesson-details')
  getLessonDetails(@Param('id') userId: string) {
    return this.userService.getLessonDetailsPerUser(userId);
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

  @UseGuards(JwtAuthGuard)
  @Get('daily-stats')
  async getDailyStats(@Req() req: Request & { user: { id: string } }) {
    return this.userService.getDailyStats(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('chat')
  async chatWithAI(
    @Body() body: { lessonId: string; message: string },
    @Req() req,
  ): Promise<{ answer: string }> {
    const userId = req.user.id;
    const answer = await this.userService.chatWithAI(userId, body.lessonId, body.message);
    return { answer };
  }

  @Get('ai-usage')
  @UseGuards(JwtAuthGuard)
  async getUsage(
    @Query('lessonId') lessonId: string,
    @Req() req,
  ): Promise<{ count: number }> {
    const userId = req.user.id;
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

  @Post("coins")
  async addCoins(@Body() body: { userId: string; coins: number }) {
    const { userId, coins } = body;
    if (!userId || !coins) {
      throw new BadRequestException('User ID va coins kiritilishi shart');
    }
    return this.userService.addCoins(userId, coins);
  }

  @UseGuards(JwtAuthGuard)
  @Post('mark-lesson-seen')
  async markLessonSeen(
    @Body() body: { lessonId: string },
    @Req() req
  ) {
    const userId = req.user.id;
    return this.userService.markLessonAsSeen(userId, body.lessonId);
  }


  @Post('assign-course')
  async assignCourseToUser(@Body() body: { email: string; courseId: string }) {
    return this.userService.assignCourse(body.email, body.courseId);
  }

  @Post("get-certificate")
  async getCertificate(@Body() body: { userId: string; courseId: string }) {
    return this.userService.getCertificate(body.userId, body.courseId);
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