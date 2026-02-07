import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { UpdateLessonsBatchDto } from "../dto/update.dto";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class UpdateLessonsBatch {
    constructor(
        private prisma: PrismaService) { }

    async update(dto: UpdateLessonsBatchDto) {
        if (!dto.updates?.length) {
            throw new BadRequestException('updates bo‘sh bo‘lishi mumkin emas');
        }

        // duplicate id check
        const ids = dto.updates.map((u) => u.id);
        const unique = new Set(ids);
        if (unique.size !== ids.length) {
            throw new BadRequestException('updates ichida takrorlangan id bor');
        }

        // mavjudligini tekshir
        const existing = await this.prisma.lessons.findMany({
            where: { id: { in: ids } },
            select: { id: true },
        });

        if (existing.length !== ids.length) {
            const existingIds = new Set(existing.map((e) => e.id));
            const missing = ids.filter((id) => !existingIds.has(id));
            throw new NotFoundException(`Lessons topilmadi: ${missing.join(', ')}`);
        }

        const updated = await this.prisma.$transaction(async (tx) => {
            const results = [];

            for (const item of dto.updates) {
                // faqat kelgan fieldlarni update qilamiz
                const data: any = {};
                if (typeof item.title !== 'undefined') data.title = item.title;
                if (typeof item.isDemo !== 'undefined') data.isDemo = item.isDemo;
                if (typeof item.isVisible !== 'undefined') data.isVisible = item.isVisible;
                if (typeof item.videoUrl !== 'undefined') data.videoUrl = item.videoUrl;
                if (typeof item.order !== 'undefined') data.order = item.order;

                if (Object.keys(data).length === 0) {
                    // bu item umuman update bermagan
                    throw new BadRequestException(
                        `Lesson ${item.id} uchun update field yo‘q`,
                    );
                }

                await tx.lessons.update({
                    where: { id: item.id },
                    data,
                    select: {
                        id: true,
                        title: true,
                        isDemo: true,
                        isVisible: true,
                        videoUrl: true,
                        order: true,
                    },
                });

            }

            return results;
        });

        return {
            updatedCount: updated.length,
            lessons: updated,
        };
    }

}