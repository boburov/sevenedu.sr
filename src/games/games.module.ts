import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';
import { DuelGateway } from './duel.gateway';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({ secret: process.env.JWT_SECRET }),
  ],
  controllers: [GamesController],
  providers: [GamesService, DuelGateway],
})
export class GamesModule {}
