import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { DictonaryService } from './dictonary.service';
import { CreateDictonaryDto } from './dto/create-dictonary.dto';

@Controller('dictonary')
export class DictonaryController {
  constructor(private readonly dictonaryService: DictonaryService) {}

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

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.dictonaryService.update(id, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.dictonaryService.remove(id);
  }
}
