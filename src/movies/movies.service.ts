import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadsService } from '../uploads/uploads.service';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';

@Injectable()
export class MoviesService {
  constructor(
    private prisma: PrismaService,
    private uploads: UploadsService,
  ) {}

  async listByCourse(courseId: string) {
    return this.prisma.movie.findMany({
      where: { courseId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async create(dto: CreateMovieDto, poster?: Express.Multer.File) {
    const posterUrl = poster
      ? await this.uploads.uploadLocalFile(poster, 'movies')
      : '';
    return this.prisma.movie.create({
      data: {
        courseId: dto.courseId,
        title: dto.title,
        videoUrl: dto.videoUrl,
        description: dto.description ?? null,
        posterUrl,
        order: dto.order ? Number(dto.order) : 0,
      },
    });
  }

  async update(
    id: string,
    dto: UpdateMovieDto,
    poster?: Express.Multer.File,
  ) {
    const existing = await this.prisma.movie.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Kino topilmadi');

    const data: Record<string, unknown> = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.videoUrl !== undefined) data.videoUrl = dto.videoUrl;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.courseId !== undefined) data.courseId = dto.courseId;
    if (dto.order !== undefined) data.order = Number(dto.order);
    if (poster) {
      data.posterUrl = await this.uploads.uploadLocalFile(poster, 'movies');
    }
    return this.prisma.movie.update({ where: { id }, data });
  }

  async remove(id: string) {
    const existing = await this.prisma.movie.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Kino topilmadi');
    await this.prisma.movie.delete({ where: { id } });
    return { message: 'Kino o‘chirildi' };
  }
}
