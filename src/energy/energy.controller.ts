import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guard/jwt-auth.guard';
import { EnergyService } from './energy.service';
import { BuyEnergyDto, SpendEnergyDto } from './dto/energy.dto';

@Controller('energy')
@UseGuards(JwtAuthGuard)
export class EnergyController {
  constructor(private readonly energy: EnergyService) {}

  /** Joriy balans (+ kunlik to'ldirishni ham shu chaqiruv bajaradi). */
  @Get()
  balance(@Req() req) {
    return this.energy.getBalance(req.user.id);
  }

  /** Do'kondagi energiya to'plamlari. */
  @Get('packs')
  packs() {
    return this.energy.listPacks();
  }

  /** Amal uchun energiya yechish (AI so'rovi / speaking bo'limi). */
  @Post('spend')
  spend(@Body() dto: SpendEnergyDto, @Req() req) {
    return this.energy.spend(req.user.id, dto.reason);
  }

  /** Tanga evaziga energiya sotib olish. */
  @Post('buy')
  buy(@Body() dto: BuyEnergyDto, @Req() req) {
    return this.energy.buyWithCoins(req.user.id, dto.packId);
  }
}
