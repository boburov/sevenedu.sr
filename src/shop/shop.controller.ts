import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ShopService } from './shop.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../guard/jwt-auth.guard';
import { AdminAuthGuard } from '../guard/admin-auth.guard';
import { PermissionsGuard } from '../guard/permissions.guard';
import { RequirePermission } from '../guard/require-permission.decorator';

@Controller('shop')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  // ── Public rasm proxy ──────────────────────────────────────────
  // CachedNetworkImage (mobil) va <img> (admin) token yubormaydi, shuning
  // uchun guardsiz. Server Telegramdan baytlarni olib stream qiladi.
  @Get('products/:id/image')
  async image(@Param('id') id: string, @Res() res: Response) {
    const { stream, contentType } = await this.shopService.getImageStream(id);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    stream.on('error', () => {
      if (!res.headersSent) res.status(502).end();
    });
    stream.pipe(res);
  }

  // ── User ───────────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Get('products')
  list() {
    return this.shopService.listProducts();
  }

  @UseGuards(JwtAuthGuard)
  @Post('products/:id/buy')
  buy(@Param('id') id: string, @Req() req) {
    return this.shopService.buyProduct(req.user.id, id);
  }

  // ── Admin CRUD (faqat admin) ───────────────────────────────────
  @UseGuards(AdminAuthGuard, PermissionsGuard)
  @RequirePermission('shop.create')
  @Post('products')
  @UseInterceptors(FileInterceptor('image'))
  create(
    @Body() dto: CreateProductDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.shopService.createProduct(dto, file);
  }

  @UseGuards(AdminAuthGuard, PermissionsGuard)
  @RequirePermission('shop.edit')
  @Patch('products/:id')
  @UseInterceptors(FileInterceptor('image'))
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.shopService.updateProduct(id, dto, file);
  }

  @UseGuards(AdminAuthGuard, PermissionsGuard)
  @RequirePermission('shop.delete')
  @Delete('products/:id')
  remove(@Param('id') id: string) {
    return this.shopService.deleteProduct(id);
  }
}
