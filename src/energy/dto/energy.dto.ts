import { IsIn, IsOptional, IsString } from 'class-validator';
import { ENERGY_COSTS } from '../energy.constants';

export class SpendEnergyDto {
  /** Qaysi amal uchun — narxni shu yerdan server aniqlaydi. */
  @IsString()
  @IsIn(Object.keys(ENERGY_COSTS))
  reason: keyof typeof ENERGY_COSTS;
}

export class BuyEnergyDto {
  /** Bo'sh bo'lsa — birinchi (asosiy) to'plam olinadi. */
  @IsOptional()
  @IsString()
  packId?: string;
}
