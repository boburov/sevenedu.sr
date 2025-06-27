import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/guard/jwt-auth.guard';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('all')
  allUser() {
    return this.userService.allUser();
  }

  @Get('check')
  checkEmail(@Query('email') email: string) {
    if (!email) throw new BadRequestException('Email kiritilmagan');
    return this.userService.checkEmail(email);
  }

  @UseGuards(JwtAuthGuard)
  @Get('user-progress')
  getUserProgress(@Req() req) {
    return this.userService.getUserProgress(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('activity-range')
  getStatsByRange(
    @Req() req,
    @Query('range') range: 'daily' | 'monthly' = 'daily',
  ) {
    return this.userService.getStatsByRange(req.user.id, range);
  }

  @Get(':id/lesson-details')
  getLessonDetails(@Param('id') id: string) {
    return this.userService.getLessonDetailsPerUser(id);
  }

  @Get('by-email')
  getUserByEmail(@Query('email') email: string) {
    if (!email) throw new BadRequestException('Email kiritilmagan');
    return this.userService.getUserByEmail(email);
  }

  @UseGuards(JwtAuthGuard)
  @Get('daily-stats')
  getDailyStats(@Req() req) {
    return this.userService.getDailyStats(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('chat')
  chatWithAI(
    @Body() body: { lessonId: string; message: string },
    @Req() req,
  ) {
    return this.userService.chatWithAI(req.user.id, body.lessonId, body.message);
  }

  @UseGuards(JwtAuthGuard)
  @Get('ai-usage')
  getUsage(@Query('lessonId') lessonId: string, @Req() req) {
    return this.userService.getAIUsage(req.user.id, lessonId);
  }

  @Get(':id')
  getUserById(@Param('id') id: string) {
    return this.userService.getUserById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('update/:id')
  @UseInterceptors(FileInterceptor('file'))
  updateUser(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Param('id') id: string,
    @Body() dto,
  ) {
    return this.userService.updateUser(id, dto);
  }

  @Post('coins')
  addCoins(@Body() body: { userId: string; coins: number }) {
    return this.userService.addCoins(body.userId, body.coins);
  }

  @UseGuards(JwtAuthGuard)
  @Post('mark-lesson-seen')
  markLessonSeen(@Body() body: { lessonId: string }, @Req() req) {
    return this.userService.markLessonAsSeen(req.user.id, body.lessonId);
  }

  @Post('assign-course')
  assignCourse(@Body() body: { email: string; courseId: string }) {
    return this.userService.assignCourse(body.email, body.courseId);
  }

  @Post('get-certificate')
  getCertificate(@Body() body: { userId: string; courseId: string }) {
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
  deleteProfilePic(@Param('id') id: string) {
    return this.userService.deleteProfilePic(id);
  }

  @Delete('all')
  deleteAllUsers() {
    return this.userService.deleteUser();
  }
}
