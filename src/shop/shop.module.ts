import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ShopController } from './shop.controller';
import { ShopService } from './shop.service';
import { TelegramService } from './telegram.service';

@Module({
  imports: [PrismaModule],
  controllers: [ShopController],
  providers: [ShopService, TelegramService],
})
export class ShopModule {}
