-- CreateTable
CREATE TABLE "LessonAIUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "LessonAIUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LessonAIUsage_userId_lessonId_date_key" ON "LessonAIUsage"("userId", "lessonId", "date");

-- AddForeignKey
ALTER TABLE "LessonAIUsage" ADD CONSTRAINT "LessonAIUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
