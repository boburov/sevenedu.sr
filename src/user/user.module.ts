import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UploadsModule } from 'src/uploads/uploads.module';

@Module({
  imports: [PrismaModule, UploadsModule],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule { }
