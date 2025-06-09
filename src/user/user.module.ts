import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UploadsModule } from 'src/uploads/uploads.module';
import { JwtModule } from '@nestjs/jwt';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [PrismaModule, UploadsModule, JwtModule, MailModule],
  exports: [UserModule],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule { }
