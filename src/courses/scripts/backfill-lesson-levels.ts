/**
 * Bir martalik backfill: `level` belgilanmagan (null) darslarga kurs ichidagi
 * tartibiga qarab CEFR daraja beradi — har 10 ta dars bir daraja:
 *   1-10 → A1, 11-20 → A2, 21-30 → B1, 31-40 → B2, 41-50 → C1, 51+ → C2.
 *
 * Admin allaqachon belgilagan darajalar (level != null) o'zgartirilmaydi.
 *
 * Ishga tushirish:
 *   npx ts-node src/courses/scripts/backfill-lesson-levels.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const GROUP_SIZE = 10;

function levelForIndex(index: number): string {
  const group = Math.floor(index / GROUP_SIZE);
  return LEVELS[Math.min(group, LEVELS.length - 1)];
}

async function main() {
  const categories = await prisma.coursesCategory.findMany({
    select: { id: true, title: true },
  });

  let updated = 0;

  for (const category of categories) {
    // Kurs ichidagi barcha darslar tartib bo'yicha (pozitsiya hisoblash uchun)
    const lessons = await prisma.lessons.findMany({
      where: { coursesCategoryId: category.id },
      orderBy: { order: 'asc' },
      select: { id: true, level: true },
    });

    for (let i = 0; i < lessons.length; i++) {
      const lesson = lessons[i];
      if (lesson.level) continue; // admin belgilagan — tegmaymiz

      await prisma.lessons.update({
        where: { id: lesson.id },
        data: { level: levelForIndex(i) },
      });
      updated++;
    }

    console.log(`✔ ${category.title}: ${lessons.length} ta dars ko'rib chiqildi`);
  }

  console.log(`\n✅ Backfill tugadi — ${updated} ta darsga daraja berildi.`);
}

main()
  .catch((e) => {
    console.error('❌ Backfill xatosi:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
