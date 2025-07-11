/*
  Warnings:

  - Made the column `score` on table `LessonActivity` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `order` to the `Lessons` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "LessonActivity" ALTER COLUMN "score" SET NOT NULL,
ALTER COLUMN "score" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "Lessons" ADD COLUMN     "order" INTEGER NOT NULL;
