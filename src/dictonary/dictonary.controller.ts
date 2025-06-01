import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { DictonaryService } from './dictonary.service';
import { CreateDictonaryDto } from './dto/create-dictonary.dto';
import { UpdateDictonaryDto } from './dto/update-dictonary.dto';

@Controller('dictonary')
export class DictonaryController {
  constructor(private readonly dictonaryService: DictonaryService) { }

  @Post(":id/add")
  async create(@Body() dto: CreateDictonaryDto, @Param("id") id: string) {
    return this.dictonaryService.create(dto, id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.dictonaryService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateDictonaryDto: UpdateDictonaryDto) {
    return this.dictonaryService.update(id, updateDictonaryDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.dictonaryService.remove(id);
  }
}
