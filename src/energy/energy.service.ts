import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ENERGY_COSTS,
  ENERGY_DAILY_ALLOWANCE,
  ENERGY_PACKS,
  EnergySpendReason,
} from './energy.constants';

export interface EnergyBalance {
  energy: number;
  dailyAllowance: number;
  costs: Record<string, number>;
  /** Keyingi kunlik to'ldirish vaqti (ISO). */
  nextRefillAt: string;
}

@Injectable()
export class EnergyService {
  constructor(private prisma: PrismaService) {}

  private startOfToday(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private startOfTomorrow(): Date {
    const d = this.startOfToday();
    d.setDate(d.getDate() + 1);
    return d;
  }

  /**
   * Kunlik to'ldirish (lazy — cron kerak emas, birinchi so'rovda bajariladi).
   * Balansni kuniga bir marta [ENERGY_DAILY_ALLOWANCE] gacha ko'taradi.
   * Sotib olingan ortiqcha energiya kuymasligi uchun limitdan yuqori balans
   * kamaytirilmaydi.
   */
  async ensureDailyRefill(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { energy: true, energyRefillAt: true },
    });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    // Bugun allaqachon to'ldirilgan.
    if (user.energyRefillAt && user.energyRefillAt >= this.startOfToday()) {
      return user.energy;
    }

    // Balans limitdan yuqori (sotib olingan) — faqat sanani belgilaymiz.
    if (user.energy >= ENERGY_DAILY_ALLOWANCE) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { energyRefillAt: new Date() },
      });
      return user.energy;
    }

    const granted = ENERGY_DAILY_ALLOWANCE - user.energy;
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { energy: ENERGY_DAILY_ALLOWANCE, energyRefillAt: new Date() },
    });
    await this.prisma.energyTransaction.create({
      data: {
        userId,
        amount: granted,
        reason: 'DAILY_REFILL',
        balance: updated.energy,
      },
    });
    return updated.energy;
  }

  /** Joriy balans + narxlar (mobil dashboard shuni ko'rsatadi). */
  async getBalance(userId: string): Promise<EnergyBalance> {
    const energy = await this.ensureDailyRefill(userId);
    return {
      energy,
      dailyAllowance: ENERGY_DAILY_ALLOWANCE,
      costs: { ...ENERGY_COSTS },
      nextRefillAt: this.startOfTomorrow().toISOString(),
    };
  }

  listPacks() {
    return ENERGY_PACKS.map((p) => ({ ...p }));
  }

  /**
   * Energiya yechish. Narx [ENERGY_COSTS] dan olinadi — mijoz miqdor yubormaydi.
   * Yetmasa 402 (PAYMENT_REQUIRED) + `code: NOT_ENOUGH_ENERGY` qaytadi.
   */
  async spend(userId: string, reason: EnergySpendReason) {
    const cost = ENERGY_COSTS[reason];
    if (!cost) throw new BadRequestException('Noma‘lum amal');

    await this.ensureDailyRefill(userId);

    // Shartli update — parallel so'rovlarda ham balans manfiyga tushmaydi.
    const res = await this.prisma.user.updateMany({
      where: { id: userId, energy: { gte: cost } },
      data: { energy: { decrement: cost } },
    });

    if (res.count === 0) {
      const current = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { energy: true },
      });
      throw new HttpException(
        {
          statusCode: HttpStatus.PAYMENT_REQUIRED,
          code: 'NOT_ENOUGH_ENERGY',
          message: `Energiya yetarli emas — bu amal uchun ${cost} energiya kerak. Do‘kondan sotib olishingiz mumkin.`,
          energy: current?.energy ?? 0,
          required: cost,
        },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }

    const after = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { energy: true },
    });
    const balance = after?.energy ?? 0;

    await this.prisma.energyTransaction.create({
      data: { userId, amount: -cost, reason, balance },
    });

    return { energy: balance, spent: cost, reason };
  }

  /** Tanga evaziga energiya xaridi (atomik: tanga − , energiya +). */
  async buyWithCoins(userId: string, packId?: string) {
    const pack = packId
      ? ENERGY_PACKS.find((p) => p.id === packId)
      : ENERGY_PACKS[0];
    if (!pack) throw new NotFoundException('Bunday to‘plam topilmadi');

    // Xariddan oldin kunlik to'ldirish — aks holda sotib olingan energiya
    // keyinroq to'ldirish paytida hisobga olinmay qolishi mumkin.
    await this.ensureDailyRefill(userId);

    return this.prisma.$transaction(async (tx) => {
      const res = await tx.user.updateMany({
        where: { id: userId, coins: { gte: pack.coins } },
        data: {
          coins: { decrement: pack.coins },
          energy: { increment: pack.energy },
        },
      });

      if (res.count === 0) {
        const current = await tx.user.findUnique({
          where: { id: userId },
          select: { coins: true },
        });
        if (!current) throw new NotFoundException('Foydalanuvchi topilmadi');
        throw new BadRequestException(
          `Tangalar yetarli emas — ${pack.coins} tanga kerak.`,
        );
      }

      const updated = await tx.user.findUnique({
        where: { id: userId },
        select: { coins: true, energy: true },
      });

      await tx.energyTransaction.create({
        data: {
          userId,
          amount: pack.energy,
          reason: 'PURCHASE',
          coinsSpent: pack.coins,
          balance: updated?.energy ?? 0,
        },
      });

      return {
        message: `${pack.energy} energiya qo‘shildi`,
        energy: updated?.energy ?? 0,
        coins: updated?.coins ?? 0,
        pack,
      };
    });
  }
}
