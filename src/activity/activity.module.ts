import { Module } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { ActivityController } from './activity.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { StreakModule } from '../streak/streak.module';

@Module({
  imports: [PrismaModule, StreakModule],
  providers: [ActivityService],
  controllers: [ActivityController]
})
export class ActivityModule {}
