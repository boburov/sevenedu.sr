import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MoviesService } from './movies.service';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { JwtAuthGuard } from '../guard/jwt-auth.guard';
import { AdminAuthGuard } from '../guard/admin-auth.guard';
import { PermissionsGuard } from '../guard/permissions.guard';
import { RequirePermission } from '../guard/require-permission.decorator';

@Controller('movies')
export class MoviesController {
  constructor(private readonly movies: MoviesService) {}

  // Kurs kinolari — mobil (JWT).
  @UseGuards(JwtAuthGuard)
  @Get('course/:courseId')
  byCourse(@Param('courseId') courseId: string) {
    return this.movies.listByCourse(courseId);
  }

  // Admin CRUD — poster VPS'ga, video Vimeo havolasi.
  @UseGuards(AdminAuthGuard, PermissionsGuard)
  @RequirePermission('movies.create')
  @Post()
  @UseInterceptors(FileInterceptor('poster'))
  create(
    @Body() dto: CreateMovieDto,
    @UploadedFile() poster: Express.Multer.File,
  ) {
    return this.movies.create(dto, poster);
  }

  @UseGuards(AdminAuthGuard, PermissionsGuard)
  @RequirePermission('movies.edit')
  @Patch(':id')
  @UseInterceptors(FileInterceptor('poster'))
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMovieDto,
    @UploadedFile() poster: Express.Multer.File,
  ) {
    return this.movies.update(id, dto, poster);
  }

  @UseGuards(AdminAuthGuard, PermissionsGuard)
  @RequirePermission('movies.delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.movies.remove(id);
  }
}
