/*
  Warnings:

  - A unique constraint covering the columns `[coursesCategoryId,order]` on the table `Lessons` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Certificate" DROP CONSTRAINT "Certificate_userId_fkey";

-- DropForeignKey
ALTER TABLE "LessonAIUsage" DROP CONSTRAINT "LessonAIUsage_userId_fkey";

-- DropForeignKey
ALTER TABLE "LessonActivity" DROP CONSTRAINT "LessonActivity_userId_fkey";

-- DropForeignKey
ALTER TABLE "NotificationRead" DROP CONSTRAINT "NotificationRead_userId_fkey";

-- DropForeignKey
ALTER TABLE "NotificationRecipient" DROP CONSTRAINT "NotificationRecipient_userId_fkey";

-- DropForeignKey
ALTER TABLE "VocabularyTestResult" DROP CONSTRAINT "VocabularyTestResult_userId_fkey";

-- AlterTable
ALTER TABLE "Lessons" ALTER COLUMN "order" SET DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "Lessons_coursesCategoryId_order_key" ON "Lessons"("coursesCategoryId", "order");

-- AddForeignKey
ALTER TABLE "VocabularyTestResult" ADD CONSTRAINT "VocabularyTestResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonActivity" ADD CONSTRAINT "LessonActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRecipient" ADD CONSTRAINT "NotificationRecipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRead" ADD CONSTRAINT "NotificationRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonAIUsage" ADD CONSTRAINT "LessonAIUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
