-- AlterTable
ALTER TABLE "LessonActivity" ADD COLUMN     "courseId" TEXT,
ADD COLUMN     "score" INTEGER;

-- AddForeignKey
ALTER TABLE "LessonActivity" ADD CONSTRAINT "LessonActivity_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "CoursesCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
