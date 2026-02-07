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
            const oldUrl = existingCategory.thumbnail;
            const oldKey = new URL(oldUrl).pathname.slice(1);
            await this.uploadsService.deleteFile(oldKey);

            const newThumbnailUrl = await this.uploadsService.uploadFile(
                file,
                'images',
            );
            dto.thumbnail = newThumbnailUrl;
        }

        return this.prisma.coursesCategory.update({
            where: { id },
            data: { ...dto },
        });
    }
}