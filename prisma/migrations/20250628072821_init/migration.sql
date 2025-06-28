/*
  Warnings:

  - You are about to drop the `Activity` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Activity" DROP CONSTRAINT "Activity_userId_fkey";

-- DropTable
DROP TABLE "Activity";

-- CreateTable
CREATE TABLE "LessonActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonsId" TEXT NOT NULL,
    "courseId" TEXT,
    "watchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "score" INTEGER,
    "vocabularyCorrect" INTEGER NOT NULL DEFAULT 0,
    "vocabularyWrong" INTEGER NOT NULL DEFAULT 0,
    "quizCorrect" INTEGER NOT NULL DEFAULT 0,
    "quizWrong" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LessonActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LessonActivity_userId_lessonsId_key" ON "LessonActivity"("userId", "lessonsId");

-- AddForeignKey
ALTER TABLE "LessonActivity" ADD CONSTRAINT "LessonActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonActivity" ADD CONSTRAINT "LessonActivity_lessonsId_fkey" FOREIGN KEY ("lessonsId") REFERENCES "Lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonActivity" ADD CONSTRAINT "LessonActivity_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "CoursesCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
