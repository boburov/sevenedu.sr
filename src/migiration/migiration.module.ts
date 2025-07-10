import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConfigModule } from '@nestjs/config';
import { MigirationController } from './migiration.controller';
import { MigirationService } from './migiration.service';

@Module({
  imports: [ConfigModule],
  controllers: [MigirationController],
  providers: [MigirationService, PrismaService],
})
export class MigrationModule {}
