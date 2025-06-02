import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UploadsModule } from 'src/uploads/uploads.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [PrismaModule, UploadsModule, JwtModule],
  exports: [UserModule],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule { }
