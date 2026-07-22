import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadsModule } from '../uploads/uploads.module';
import { MailModule } from '../mail/mail.module';
import { EnergyModule } from '../energy/energy.module';

@Module({
  imports: [PrismaModule, UploadsModule, JwtModule, MailModule, EnergyModule],
  exports: [UserService],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule { }
