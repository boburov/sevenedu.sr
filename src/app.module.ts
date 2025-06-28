import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { MailService } from './mail/mail.service';
import { CoursesModule } from './courses/courses.module';
import { UploadsModule } from './uploads/uploads.module';
import { QuizsModule } from './quizs/quizs.module';
import { QuessionsModule } from './quessions/quessions.module';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsModule } from './notifications/notifications.module';
import { DictonaryModule } from './dictonary/dictonary.module';
import { ActivityModule } from './activity/activity.module';
import { ActivityModule } from './activity/activity.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    UserModule,
    AuthModule,
    CoursesModule,
    UploadsModule,
    QuizsModule,
    QuessionsModule,
    DictonaryModule,
    NotificationsModule,
    ActivityModule,
  ],
  controllers: [AppController],
  providers: [AppService, MailService],
})
export class AppModule { }
