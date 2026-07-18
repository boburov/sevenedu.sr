import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from './telegram.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ShopService {
  constructor(
    private prisma: PrismaService,
    private telegram: TelegramService,
    private config: ConfigService,
  ) {}

  private get baseUrl(): string {
    const upload = this.config.get('upload') || {};
    return (upload.publicBaseUrl || process.env.PUBLIC_BASE_URL || '').replace(
      /\/+$/,
      '',
    );
  }

  /** Client uchun mahsulot ko'rinishi — imageUrl server proxy'ga ishora qiladi. */
  private toDto(p: {
    id: string;
    name: string;
    price: number;
    createdAt: Date;
  }) {
    return {
      id: p.id,
      name: p.name,
      price: p.price,
      imageUrl: `${this.baseUrl}/shop/products/${p.id}/image`,
      createdAt: p.createdAt,
    };
  }

  async createProduct(dto: CreateProductDto, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Mahsulot rasmi majburiy');
    const telegramFileId = await this.telegram.uploadImage(file);
    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        price: Number(dto.price),
        telegramFileId,
      },
    });
    return this.toDto(product);
  }

  async listProducts() {
    const products = await this.prisma.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return products.map((p) => this.toDto(p));
  }

  async updateProduct(
    id: string,
    dto: UpdateProductDto,
    file?: Express.Multer.File,
  ) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Mahsulot topilmadi');

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.price !== undefined) data.price = Number(dto.price);
    if (file) data.telegramFileId = await this.telegram.uploadImage(file);

    const product = await this.prisma.product.update({ where: { id }, data });
    return this.toDto(product);
  }

  async deleteProduct(id: string) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Mahsulot topilmadi');
    await this.prisma.product.delete({ where: { id } });
    return { message: 'Mahsulot o‘chirildi' };
  }

  async getImageStream(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) throw new NotFoundException('Mahsulot topilmadi');
    return this.telegram.getFileStream(product.telegramFileId);
  }

  /** Savatchasiz xarid — tanga yetsa darhol sotib oladi (atomik transaksiya). */
  async buyProduct(userId: string, productId: string) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product || !product.isActive) {
        throw new NotFoundException('Mahsulot topilmadi');
      }

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { coins: true },
      });
      if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

      if (user.coins < product.price) {
        throw new BadRequestException('Tangalar yetarli emas');
      }

      const updated = await tx.user.update({
        where: { id: userId },
        data: { coins: user.coins - product.price },
      });

      await tx.purchase.create({
        data: { userId, productId, coinsSpent: product.price },
      });

      return {
        message: 'Xarid muvaffaqiyatli amalga oshirildi',
        coins: updated.coins,
      };
    });
  }
}
