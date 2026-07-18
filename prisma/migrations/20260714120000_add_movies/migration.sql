-- CreateTable
CREATE TABLE "Movie" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "posterUrl" TEXT NOT NULL DEFAULT '',
    "videoUrl" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Movie_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Movie_courseId_idx" ON "Movie"("courseId");

-- AddForeignKey
ALTER TABLE "Movie" ADD CONSTRAINT "Movie_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "CoursesCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
