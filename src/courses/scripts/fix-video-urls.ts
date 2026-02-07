import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class FixVideoUrls {
    constructor(private prisma: PrismaService) { }

    async fixAllVideoUrls() {
        const lessons = await this.prisma.lessons.findMany({
            where: {
                videoUrl: {
                    contains: '-',
                },
            },
        });

        const updatedLessons: {
            lessonId: string;
            oldUrl: string;
            newUrl: string;
        }[] = [];

        for (const lesson of lessons) {
            const oldUrl = lesson.videoUrl;

            const filename = oldUrl.split('/').pop();
            if (!filename) continue;

            const parts = filename.split('-');
            if (parts.length < 2) continue;

            const correctFilename = parts[1];
            const correctUrl = oldUrl.replace(filename, correctFilename);

            await this.prisma.lessons.update({
                where: { id: lesson.id },
                data: {
                    videoUrl: correctUrl,
                },
            });

            updatedLessons.push({
                lessonId: lesson.id,
                oldUrl,
                newUrl: correctUrl,
            });
        }

        return {
            updatedCount: updatedLessons.length,
            updatedLessons,
        };
    }

}