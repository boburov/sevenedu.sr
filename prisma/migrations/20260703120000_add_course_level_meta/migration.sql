-- CreateTable
CREATE TABLE "CourseLevelMeta" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CourseLevelMeta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CourseLevelMeta_courseId_level_key" ON "CourseLevelMeta"("courseId", "level");

-- AddForeignKey
ALTER TABLE "CourseLevelMeta" ADD CONSTRAINT "CourseLevelMeta_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "CoursesCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
