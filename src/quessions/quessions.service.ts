import { Injectable } from '@nestjs/common';
import { CreateQuessionDto } from './dto/create-quession.dto';
import { UpdateQuessionDto } from './dto/update-quession.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QuessionsService {
  constructor(private prisma: PrismaService) { }

  async create(id: string, createQuessionDto: CreateQuessionDto) {
    const { quession } = createQuessionDto
    const create = await this.prisma.quessions.create({ data: { quession, lessonsId: id } })
    return create
  }


  async update(id: string, updateQuessionDto: UpdateQuessionDto) {
    const { quession } = updateQuessionDto
    const find = await this.prisma.quessions.update({
      where: { id },
      data: {
        quession
      }
    })

    return find
  }

  async remove(id: string) {
    await this.prisma.quessions.delete({ where: { id } })
    return { msg: "quession deleted" }
  }
}
