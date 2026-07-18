import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { QuizsService } from './quizs.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { AdminAuthGuard } from '../guard/admin-auth.guard';
import { PermissionsGuard } from '../guard/permissions.guard';
import { RequirePermission } from '../guard/require-permission.decorator';

@Controller('quizs')
export class QuizsController {
  constructor(private readonly quizsService: QuizsService) { }

  @UseGuards(AdminAuthGuard, PermissionsGuard)
  @RequirePermission('quiz.create')
  @Post(":id/create")
  create(
    @Param("id") id: string,
    @Body() createQuizDto: CreateQuizDto,
  ) {
    return this.quizsService.create(createQuizDto, id);
  }

  @UseGuards(AdminAuthGuard, PermissionsGuard)
  @RequirePermission('quiz.edit')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateQuizDto: UpdateQuizDto) {
    return this.quizsService.update(id, updateQuizDto);
  }

  @UseGuards(AdminAuthGuard, PermissionsGuard)
  @RequirePermission('quiz.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.quizsService.remove(id);
  }
}
