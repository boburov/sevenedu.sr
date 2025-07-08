import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { QuizsService } from './quizs.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';

@Controller('quizs')
export class QuizsController {
  constructor(private readonly quizsService: QuizsService) { }

  @Post(":id/create")
  create(
    @Param("id") id: string,
    @Body() createQuizDto: CreateQuizDto,
  ) {
    return this.quizsService.create(createQuizDto, id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateQuizDto: UpdateQuizDto) {
    return this.quizsService.update(id, updateQuizDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.quizsService.remove(id);
  }
}
