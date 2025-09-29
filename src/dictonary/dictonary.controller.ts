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

  @Post(':id/add')
  async create(@Body() dto: CreateDictonaryDto, @Param('id') id: string) {
    return this.dictonaryService.createMany(dto.items, id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.dictonaryService.findOne(id);
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
