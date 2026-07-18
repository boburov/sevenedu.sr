import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadsModule } from '../uploads/uploads.module';
import { MoviesController } from './movies.controller';
import { MoviesService } from './movies.service';

@Module({
  imports: [PrismaModule, UploadsModule],
  controllers: [MoviesController],
  providers: [MoviesService],
})
export class MoviesModule {}
