import { Injectable, NotFoundException } from "@nestjs/common";
import { UpdateLessonDto } from "../dto/update-lesson.dto";
import { PrismaService } from "../../prisma/prisma.service";
import { UploadsService } from "../../uploads/uploads.service";

@Injectable()
export class UpdateLessonUsecase {

    constructor(
        private prisma: PrismaService,
        private uploadsService: UploadsService) { }

    async update(
        id: string,
        dto: UpdateLessonDto,
        file?: Express.Multer.File,
    ) {
        const existingLesson = await this.prisma.lessons.findUnique({
            where: { id },
        });

        if (!existingLesson) {
            throw new NotFoundException('Dars topilmadi');
        }

        if (file) {
            const oldUrl = existingLesson.videoUrl;

            if (oldUrl) {
                const oldKey = new URL(oldUrl).pathname.slice(1);
                await this.uploadsService.deleteFile(oldKey);
            }
            const newVideoUrl = await this.uploadsService.uploadFile(file, 'videos');
            dto.videoUrl = newVideoUrl;
        }

        if (typeof dto.isDemo === 'string') {
            dto.isDemo = dto.isDemo === 'true';
        }

        return this.prisma.lessons.update({
            where: { id },
            data: {
                ...dto,
            },
        });
    }

}