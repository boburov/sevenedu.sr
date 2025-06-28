/*
  Warnings:

  - You are about to drop the column `lastLoginAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `isFinished` on the `UserCourse` table. All the data in the column will be lost.
  - You are about to drop the `Activity` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Certificate` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LessonAIUsage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `VocabularyTestResult` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Activity" DROP CONSTRAINT "Activity_userId_fkey";

-- DropForeignKey
ALTER TABLE "Certificate" DROP CONSTRAINT "Certificate_courseId_fkey";

-- DropForeignKey
ALTER TABLE "Certificate" DROP CONSTRAINT "Certificate_userId_fkey";

-- DropForeignKey
ALTER TABLE "LessonAIUsage" DROP CONSTRAINT "LessonAIUsage_userId_fkey";

-- DropForeignKey
ALTER TABLE "VocabularyTestResult" DROP CONSTRAINT "VocabularyTestResult_userId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "lastLoginAt";

-- AlterTable
ALTER TABLE "UserCourse" DROP COLUMN "isFinished";

-- DropTable
DROP TABLE "Activity";

-- DropTable
DROP TABLE "Certificate";

-- DropTable
DROP TABLE "LessonAIUsage";

-- DropTable
DROP TABLE "VocabularyTestResult";

-- CreateTable
CREATE TABLE "UserCourseProgress" (
    "id" TEXT NOT NULL,
    "userCourseId" TEXT NOT NULL,
    "completedLessons" INTEGER NOT NULL DEFAULT 0,
    "totalLessons" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCourseProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonsId" TEXT NOT NULL,
    "watchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonsId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabularyProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dictonaryId" TEXT NOT NULL,
    "learnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VocabularyProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserGift" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserGift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "lessonsWatched" INTEGER NOT NULL,
    "wordsLearned" INTEGER NOT NULL,
    "testsPassed" INTEGER NOT NULL,

    CONSTRAINT "DailyActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MentorMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LessonActivity_userId_lessonsId_key" ON "LessonActivity"("userId", "lessonsId");

-- CreateIndex
CREATE UNIQUE INDEX "QuizProgress_userId_lessonsId_key" ON "QuizProgress"("userId", "lessonsId");

-- CreateIndex
CREATE UNIQUE INDEX "VocabularyProgress_userId_dictonaryId_key" ON "VocabularyProgress"("userId", "dictonaryId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyActivityLog_date_key" ON "DailyActivityLog"("date");

-- AddForeignKey
ALTER TABLE "UserCourseProgress" ADD CONSTRAINT "UserCourseProgress_userCourseId_fkey" FOREIGN KEY ("userCourseId") REFERENCES "UserCourse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonActivity" ADD CONSTRAINT "LessonActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonActivity" ADD CONSTRAINT "LessonActivity_lessonsId_fkey" FOREIGN KEY ("lessonsId") REFERENCES "Lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizProgress" ADD CONSTRAINT "QuizProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizProgress" ADD CONSTRAINT "QuizProgress_lessonsId_fkey" FOREIGN KEY ("lessonsId") REFERENCES "Lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyProgress" ADD CONSTRAINT "VocabularyProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyProgress" ADD CONSTRAINT "VocabularyProgress_dictonaryId_fkey" FOREIGN KEY ("dictonaryId") REFERENCES "Dictonary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGift" ADD CONSTRAINT "UserGift_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyActivityLog" ADD CONSTRAINT "DailyActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorMessage" ADD CONSTRAINT "MentorMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
