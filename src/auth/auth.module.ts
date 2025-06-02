import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from 'src/prisma/prisma.module';
import { MailModule } from 'src/mail/mail.module';
import { UserService } from 'src/user/user.service';
import { UploadsModule } from 'src/uploads/uploads.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.register({
      secret: 'KOTUNMUNKAMIU82YRW87EYH7A8FYHFIUAYS7FASF87AS7F78ATSF87ASITV87AJS9EHYF7AS89F7E9TAG7ASTURSIGMNIRASMZIERI96Y76Y979TSUNADEJUDASESKDUALSNU',
      signOptions: { expiresIn: '7d' },
    })
    , PrismaModule, MailModule, UploadsModule],
  controllers: [AuthController],
  providers: [AuthService, UserService]
})
export class AuthModule { }
