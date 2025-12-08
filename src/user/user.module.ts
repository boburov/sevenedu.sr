import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadsModule } from '../uploads/uploads.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [PrismaModule, UploadsModule, JwtModule, MailModule],
  exports: [UserModule],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule { }
