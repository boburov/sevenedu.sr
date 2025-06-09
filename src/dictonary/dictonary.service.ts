import { HttpException, Injectable } from '@nestjs/common';
import { CreateDictonaryDto } from './dto/create-dictonary.dto';
import { UpdateDictonaryDto } from './dto/update-dictonary.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class DictonaryService {

  constructor(private prisma: PrismaService,) { }

  async create(createDictonaryDto: CreateDictonaryDto, id: string) {
    const { word, translated } = createDictonaryDto
    const find = await this.prisma.dictonary.findFirst({ where: { word } })
    if (find) throw new HttpException(`Sorry You can't use This Word`, 500)

    const newDictonaty = await this.prisma.dictonary.create({
      data: {
        word,
        translated,
        lessonsId: id
      }
    })

    return newDictonaty

  }


  async findOne(id: string) {
    const find = await this.prisma.dictonary.findFirst({ where: { id } })
    if (!find) throw new HttpException(`Dictonary not found`, 404)
    return find
  }

  async update(id: string, updateDictonaryDto: UpdateDictonaryDto) {
    const { word, translated } = updateDictonaryDto
    const find = await this.prisma.dictonary.findFirst({ where: { id } })
    if (!find) throw new HttpException(`Dictonary not found`, 404)
    const update = await this.prisma.dictonary.update({
      where: { id },
      data: {
        word,
        translated,
      }
    })

    return update

  }

  async remove(id: string) {
    return await this.prisma.dictonary.delete({ where: { id } })
  }
}
