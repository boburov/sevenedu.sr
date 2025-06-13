/*
  Warnings:

  - You are about to drop the `VocabularyResult` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "VocabularyResult" DROP CONSTRAINT "VocabularyResult_userId_fkey";

-- DropForeignKey
ALTER TABLE "VocabularyResult" DROP CONSTRAINT "VocabularyResult_wordId_fkey";

-- AlterTable
ALTER TABLE "LessonActivity" ADD COLUMN     "quizCorrect" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "quizWrong" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "vocabularyCorrect" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "vocabularyWrong" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "VocabularyResult";
