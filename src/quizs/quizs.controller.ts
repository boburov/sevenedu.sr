import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { QuizsService } from './quizs.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';

@Controller('quizs')
export class QuizsController {
  constructor(private readonly quizsService: QuizsService) { }

  @Post(":id/new-quiz")
  create(
    @Body() createQuizDto: CreateQuizDto,
    @Param("id") id: string
  ) {
    return this.quizsService.create(createQuizDto, id);
  }

  @Get(':id')
  async findAll(@Param() id: string) {
    return this.quizsService.findAll(id);
  }

  @Patch(':id/:quizid')
  update(@Param('id') id: string, @Param('quizid') quizid: string, @Body() updateQuizDto: UpdateQuizDto) {
    return this.quizsService.update(id, updateQuizDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.quizsService.remove(id);
  }
}
