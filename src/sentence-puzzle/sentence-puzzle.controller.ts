import {
  Controller,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Get,
} from '@nestjs/common';
import { SentencePuzzleService } from './sentence-puzzle.service';

@Controller('sentence-puzzle')
export class SentencePuzzleController {
  constructor(private readonly service: SentencePuzzleService) {}

  @Post(':lessonId/create')
  async create(
    @Param('lessonId') lessonId: string,
    @Body() body: { sentence: string; answer: string },
  ) {
    return this.service.create(lessonId, body.sentence, body.answer);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: { sentence?: string; answer?: string },
  ) {
    return this.service.update(id, body.sentence, body.answer);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Get(':lessonId')
  async findByLesson(@Param('lessonId') lessonId: string) {
    return this.service.findByLesson(lessonId);
  }
}
