import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { QuessionsService } from './quessions.service';
import { CreateQuessionDto } from './dto/create-quession.dto';
import { UpdateQuessionDto } from './dto/update-quession.dto';
import { AdminAuthGuard } from '../guard/admin-auth.guard';
import { PermissionsGuard } from '../guard/permissions.guard';
import { RequirePermission } from '../guard/require-permission.decorator';

@Controller('quessions')
export class QuessionsController {
  constructor(private readonly quessionsService: QuessionsService) { }

  @UseGuards(AdminAuthGuard, PermissionsGuard)
  @RequirePermission('quiz.create')
  @Post(":id/create")
  async create(@Body() createQuessionDto: CreateQuessionDto, @Param('id') id: string) {
    return this.quessionsService.create(id, createQuessionDto);
  }

  @UseGuards(AdminAuthGuard, PermissionsGuard)
  @RequirePermission('quiz.edit')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateQuessionDto: UpdateQuessionDto) {
    return this.quessionsService.update(id, updateQuessionDto);
  }

  @UseGuards(AdminAuthGuard, PermissionsGuard)
  @RequirePermission('quiz.delete')
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.quessionsService.remove(id);
  }
}
