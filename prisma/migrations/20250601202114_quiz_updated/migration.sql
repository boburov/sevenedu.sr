/*
  Warnings:

  - You are about to drop the `Options` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `currentOption` to the `Quizs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `option1` to the `Quizs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `option2` to the `Quizs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `option3` to the `Quizs` table without a default value. This is not possible if the table is not empty.
  - Made the column `lessonsId` on table `Quizs` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Options" DROP CONSTRAINT "Options_quizsId_fkey";

-- DropForeignKey
ALTER TABLE "Quizs" DROP CONSTRAINT "Quizs_lessonsId_fkey";

-- AlterTable
ALTER TABLE "Quizs" ADD COLUMN     "currentOption" TEXT NOT NULL,
ADD COLUMN     "option1" TEXT NOT NULL,
ADD COLUMN     "option2" TEXT NOT NULL,
ADD COLUMN     "option3" TEXT NOT NULL,
ALTER COLUMN "lessonsId" SET NOT NULL;

-- DropTable
DROP TABLE "Options";

-- AddForeignKey
ALTER TABLE "Quizs" ADD CONSTRAINT "Quizs_lessonsId_fkey" FOREIGN KEY ("lessonsId") REFERENCES "Lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
