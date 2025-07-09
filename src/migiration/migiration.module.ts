import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConfigModule } from '@nestjs/config';
import { MigrationController } from './migiration.controller';
import { MigrationService } from './migiration.service';

@Module({
  imports: [ConfigModule],
  controllers: [MigrationController],
  providers: [MigrationService, PrismaService],
})
export class MigrationModule {}
