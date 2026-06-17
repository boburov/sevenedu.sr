import { HttpException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UploadsService } from "../../uploads/uploads.service";
import { UpdateCategoryDto } from "../dto/update-course.dto";

@Injectable()
export class UpdateCategory {
    constructor(private prisma: PrismaService, private uploadsService: UploadsService) { }

    // update Category 
    async update(
        id: string,
        dto: UpdateCategoryDto,
        file?: Express.Multer.File,
    ) {
        const existingCategory = await this.prisma.coursesCategory.findUnique({
            where: { id },
        });
        if (!existingCategory) throw new NotFoundException('Kategoriya topilmadi');

        if (file) {
            // Eski rasm faqat VPS'dagi (lokal) bo'lsa o'chiriladi; eski S3 URL'larga tegmaymiz.
            await this.uploadsService.deleteLocalFile(existingCategory.thumbnail);

            // Yangi thumbnail VPS'ga (lokal) yuklanadi, S3'ga emas.
            const newThumbnailUrl = await this.uploadsService.uploadLocalFile(
                file,
                'courses',
            );
            dto.thumbnail = newThumbnailUrl;
        }

        return this.prisma.coursesCategory.update({
            where: { id },
            data: { ...dto },
        });
    }
}