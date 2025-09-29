import { HttpException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class DictonaryService {
  constructor(private prisma: PrismaService) {}

  async createMany(items: { word: string; translated: string }[], id: string) {
    if (!items || items.length === 0) {
      throw new HttpException('Kamida bitta soʻz yuboring!', 400);
    }

    const words = items.map((i) => i.word);
    const existing = await this.prisma.dictonary.findMany({
      where: { word: { in: words } },
    });

    if (existing.length > 0) {
      throw new HttpException(
        `Bu so'zlar mavjud: ${existing.map((e) => e.word).join(', ')}`,
        400,
      );
    }

    const created = await this.prisma.dictonary.createMany({
      data: items.map((i) => ({
        word: i.word,
        translated: i.translated,
        lessonsId: id,
      })),
    });

    return {
      count: created.count,
      message: `${created.count} ta so'z muvaffaqiyatli qo'shildi!`,
    };
  }

  async findOne(id: string) {
    const find = await this.prisma.dictonary.findFirst({ where: { id } });
    if (!find) throw new HttpException('Soʻz topilmadi', 404);
    return find;
  }

  async update(id: string, data: { word: string; translated: string }) {
    const find = await this.prisma.dictonary.findFirst({ where: { id } });
    if (!find) throw new HttpException('Soʻz topilmadi', 404);

    return await this.prisma.dictonary.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return await this.prisma.dictonary.delete({ where: { id } });
  }
}
