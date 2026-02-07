import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class ReorderService {
    constructor(private prisma: PrismaService) { }

    async lessons(
        categoryId: string,
        reorderData:
            | { lessonId: string; newIndex: number }
            | Array<{ lessonId: string; newIndex: number }>,
    ) {
        const category = await this.prisma.coursesCategory.findUnique({
            where: { id: categoryId },
            include: {
                lessons: {
                    where: { isVisible: true },
                    orderBy: { order: 'asc' },
                },
            },
        });

        if (!category) throw new NotFoundException('Category not found');

        const reorderArray = Array.isArray(reorderData)
            ? reorderData
            : [reorderData];
        const usedIndexes = new Set<number>();

        // Validatsiyalar
        for (const item of reorderArray) {
            const lessonExists = category.lessons.some(
                (lesson) => lesson.id === item.lessonId,
            );
            if (!lessonExists)
                throw new NotFoundException(`Lesson ${item.lessonId} not found`);

            if (item.newIndex < 0 || item.newIndex >= category.lessons.length) {
                throw new BadRequestException(
                    `Invalid index ${item.newIndex} for lesson ${item.lessonId}`,
                );
            }

            if (usedIndexes.has(item.newIndex)) {
                throw new BadRequestException(`Duplicate index ${item.newIndex}`);
            }
            usedIndexes.add(item.newIndex);
        }

        return await this.prisma.$transaction(async (tx) => {
            // Vaqtincha barcha orderlarni negative qilish
            await Promise.all(
                category.lessons.map((lesson) =>
                    tx.lessons.update({
                        where: { id: lesson.id },
                        data: { order: -lesson.order },
                    }),
                ),
            );

            // Yangi tartib
            const reorderedLessons = [...category.lessons];

            // Barcha o'zgartirishlarni bajarish
            reorderArray.forEach((item) => {
                const currentIndex = reorderedLessons.findIndex(
                    (l) => l.id === item.lessonId,
                );
                if (currentIndex !== -1) {
                    const [movedLesson] = reorderedLessons.splice(currentIndex, 1);
                    reorderedLessons.splice(item.newIndex, 0, movedLesson);
                }
            });

            // Yangi orderlarni yangilash
            await Promise.all(
                reorderedLessons.map((lesson, index) =>
                    tx.lessons.update({
                        where: { id: lesson.id },
                        data: { order: index + 1 },
                    }),
                ),
            );

            return await tx.coursesCategory.findUnique({
                where: { id: categoryId },
                include: {
                    lessons: {
                        where: { isVisible: true },
                        orderBy: { order: 'asc' },
                    },
                },
            });
        });
    }

    async updateLessonOrdersByCategory() {
        const categories = await this.prisma.lessons.findMany({
            distinct: ['coursesCategoryId'],
            select: {
                coursesCategoryId: true,
            },
        });

        for (const { coursesCategoryId } of categories) {
            const lessons = await this.prisma.lessons.findMany({
                where: { coursesCategoryId },
                orderBy: { id: 'asc' },
            });

            for (let i = 0; i < lessons.length; i++) {
                await this.prisma.lessons.update({
                    where: { id: lessons[i].id },
                    data: { order: i },
                });
            }
        }

        return { message: 'Darslar muvaffaqiyatli tartiblandi.' };
    }

}