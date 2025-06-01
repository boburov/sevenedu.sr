/*
  Warnings:

  - Made the column `coursesCategoryId` on table `Lessons` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Lessons" DROP CONSTRAINT "Lessons_coursesCategoryId_fkey";

-- AlterTable
ALTER TABLE "Lessons" ALTER COLUMN "coursesCategoryId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Lessons" ADD CONSTRAINT "Lessons_coursesCategoryId_fkey" FOREIGN KEY ("coursesCategoryId") REFERENCES "CoursesCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
