-- AlterTable
ALTER TABLE "Lessons" ADD COLUMN     "coursesCategoryId" TEXT;

-- AddForeignKey
ALTER TABLE "Lessons" ADD CONSTRAINT "Lessons_coursesCategoryId_fkey" FOREIGN KEY ("coursesCategoryId") REFERENCES "CoursesCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
