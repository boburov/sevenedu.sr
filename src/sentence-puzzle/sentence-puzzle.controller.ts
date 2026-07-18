import {
  Controller,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Get,
  UseGuards,
} from '@nestjs/common';
import { SentencePuzzleService } from './sentence-puzzle.service';
import { AdminAuthGuard } from '../guard/admin-auth.guard';
import { PermissionsGuard } from '../guard/permissions.guard';
import { RequirePermission } from '../guard/require-permission.decorator';

@Controller('sentence-puzzle')
export class SentencePuzzleController {
  constructor(private readonly service: SentencePuzzleService) {}

  @UseGuards(AdminAuthGuard, PermissionsGuard)
  @RequirePermission('sentencePuzzle.create')
  @Post(':lessonId/create')
  async create(
    @Param('lessonId') lessonId: string,
    @Body() body: { sentence: string; answer: string },
  ) {
    return this.service.create(lessonId, body.sentence, body.answer);
  }

  @UseGuards(AdminAuthGuard, PermissionsGuard)
  @RequirePermission('sentencePuzzle.edit')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: { sentence?: string; answer?: string },
  ) {
    return this.service.update(id, body.sentence, body.answer);
  }

  @UseGuards(AdminAuthGuard, PermissionsGuard)
  @RequirePermission('sentencePuzzle.delete')
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Get(':lessonId')
  async findByLesson(@Param('lessonId') lessonId: string) {
    return this.service.findByLesson(lessonId);
  }
}
