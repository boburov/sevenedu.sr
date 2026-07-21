import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EnergyController } from './energy.controller';
import { EnergyService } from './energy.service';

@Module({
  imports: [PrismaModule],
  controllers: [EnergyController],
  providers: [EnergyService],
  // AI chat (UserModule) energiyani shu servis orqali yechadi.
  exports: [EnergyService],
})
export class EnergyModule {}
