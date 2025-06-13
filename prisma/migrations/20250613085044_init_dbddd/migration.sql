/*
  Warnings:

  - You are about to drop the `DailyActivityLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `QuizResult` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserCourseProgress` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserGift` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "DailyActivityLog" DROP CONSTRAINT "DailyActivityLog_userId_fkey";

-- DropForeignKey
ALTER TABLE "QuizResult" DROP CONSTRAINT "QuizResult_quizId_fkey";

-- DropForeignKey
ALTER TABLE "QuizResult" DROP CONSTRAINT "QuizResult_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserCourseProgress" DROP CONSTRAINT "UserCourseProgress_userCourseId_fkey";

-- DropForeignKey
ALTER TABLE "UserGift" DROP CONSTRAINT "UserGift_userId_fkey";

-- DropTable
DROP TABLE "DailyActivityLog";

-- DropTable
DROP TABLE "QuizResult";

-- DropTable
DROP TABLE "UserCourseProgress";

-- DropTable
DROP TABLE "UserGift";
