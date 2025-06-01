import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { QuessionsService } from './quessions.service';
import { CreateQuessionDto } from './dto/create-quession.dto';
import { UpdateQuessionDto } from './dto/update-quession.dto';

@Controller('quessions')
export class QuessionsController {
  constructor(private readonly quessionsService: QuessionsService) { }

  @Post(":id/create")
  async create(@Body() createQuessionDto: CreateQuessionDto, @Param('id') id: string) {
    return this.quessionsService.create(id, createQuessionDto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateQuessionDto: UpdateQuessionDto) {
    return this.quessionsService.update(id, updateQuessionDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.quessionsService.remove(id);
  }
}
