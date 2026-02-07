import { HttpException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateCategoryCourseDto } from "../dto/create-course-category.dto";
import { UploadsService } from "../../uploads/uploads.service";
import { UpdateCategoryDto } from "../dto/update-course.dto";
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class Category {
    constructor(private prisma: PrismaService, private uploadsService: UploadsService) { }

    //  CREATE Category
    async create(
        dto: CreateCategoryCourseDto,
        file: Express.Multer.File,
    ) {
        const { title, shortName, goal } = dto;

        const existing = await this.prisma.coursesCategory.findFirst({
            where: { shortName },
        });
        if (existing)
            throw new HttpException('Bu kategoriya allaqachon mavjud!', 400);

        const uploadedThumbnail = await this.uploadsService.uploadFile(
            file,
            'images',
        );

        const newCategory = await this.prisma.coursesCategory.create({
            data: {
                title,
                shortName,
                goal,
                thumbnail: uploadedThumbnail,
            },
        });

        return newCategory;
    }

    // GET Category By ID
    async getcategory(id: string) {
        const get = await this.prisma.coursesCategory.findFirst({
            where: { id },
            include: {
                lessons: {
                    select: {
                        id: true,
                        title: true,
                        isDemo: true,
                        videoUrl: true,
                        order: true,
                        isVisible: true,
                    },
                    orderBy: { order: 'asc' },
                },
            },
        });
        return get;
    }

    // GET lesson by ID
    async getLessonById(id: string) {
        const lesson = await this.prisma.lessons.findFirst({
            where: { id },
            include: {},
        });

        if (!lesson) throw new NotFoundException('Dars topilmadi');
        return lesson;
    }
}