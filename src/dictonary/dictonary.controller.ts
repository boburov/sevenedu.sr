import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { DictonaryService } from './dictonary.service';
import { CreateDictonaryDto } from './dto/create-dictonary.dto';
import { AdminAuthGuard } from '../guard/admin-auth.guard';
import { PermissionsGuard } from '../guard/permissions.guard';
import { RequirePermission } from '../guard/require-permission.decorator';

@Controller('dictonary')
export class DictonaryController {
  constructor(private readonly dictonaryService: DictonaryService) {}

  @UseGuards(AdminAuthGuard, PermissionsGuard)
  @RequirePermission('dictionary.create')
  @Post(':lessonId/add')
  async create(
    @Body() dto: CreateDictonaryDto,
    @Param('lessonId') lessonId: string,
  ) {
    return this.dictonaryService.createMany(dto.items, lessonId);
  }

  @Get('lesson/:lessonId')
  async getByLesson(@Param('lessonId') lessonId: string) {
    return this.dictonaryService.getByLessonId(lessonId);
  }

  @UseGuards(AdminAuthGuard, PermissionsGuard)
  @RequirePermission('dictionary.edit')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.dictonaryService.update(id, body);
  }

  @UseGuards(AdminAuthGuard, PermissionsGuard)
  @RequirePermission('dictionary.delete')
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.dictonaryService.remove(id);
  }
}
