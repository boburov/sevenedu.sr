/*
  Warnings:

  - You are about to drop the `DailyActivityLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LessonActivity` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MentorMessage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `QuizProgress` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserCourseProgress` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserGift` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VocabularyProgress` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "DailyActivityLog" DROP CONSTRAINT "DailyActivityLog_userId_fkey";

-- DropForeignKey
ALTER TABLE "LessonActivity" DROP CONSTRAINT "LessonActivity_lessonsId_fkey";

-- DropForeignKey
ALTER TABLE "LessonActivity" DROP CONSTRAINT "LessonActivity_userId_fkey";

-- DropForeignKey
ALTER TABLE "MentorMessage" DROP CONSTRAINT "MentorMessage_userId_fkey";

-- DropForeignKey
ALTER TABLE "QuizProgress" DROP CONSTRAINT "QuizProgress_lessonsId_fkey";

-- DropForeignKey
ALTER TABLE "QuizProgress" DROP CONSTRAINT "QuizProgress_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserCourseProgress" DROP CONSTRAINT "UserCourseProgress_userCourseId_fkey";

-- DropForeignKey
ALTER TABLE "UserGift" DROP CONSTRAINT "UserGift_userId_fkey";

-- DropForeignKey
ALTER TABLE "VocabularyProgress" DROP CONSTRAINT "VocabularyProgress_dictonaryId_fkey";

-- DropForeignKey
ALTER TABLE "VocabularyProgress" DROP CONSTRAINT "VocabularyProgress_userId_fkey";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastLoginAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "UserCourse" ADD COLUMN     "isFinished" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "DailyActivityLog";

-- DropTable
DROP TABLE "LessonActivity";

-- DropTable
DROP TABLE "MentorMessage";

-- DropTable
DROP TABLE "QuizProgress";

-- DropTable
DROP TABLE "UserCourseProgress";

-- DropTable
DROP TABLE "UserGift";

-- DropTable
DROP TABLE "VocabularyProgress";

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "watchedLesson" BOOLEAN NOT NULL DEFAULT false,
    "vocabularyLearned" INTEGER NOT NULL DEFAULT 0,
    "testScore" INTEGER NOT NULL DEFAULT 0,
    "vocabTestScore" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabularyTestResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "correct" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,

    CONSTRAINT "VocabularyTestResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonAIUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LessonAIUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Activity_userId_date_key" ON "Activity"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "VocabularyTestResult_userId_date_key" ON "VocabularyTestResult"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "LessonAIUsage_userId_lessonId_date_key" ON "LessonAIUsage"("userId", "lessonId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_userId_courseId_key" ON "Certificate"("userId", "courseId");

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyTestResult" ADD CONSTRAINT "VocabularyTestResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonAIUsage" ADD CONSTRAINT "LessonAIUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "CoursesCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
