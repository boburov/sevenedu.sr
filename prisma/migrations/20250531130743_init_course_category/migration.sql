/*
  Warnings:

  - Added the required column `shortName` to the `CoursesCategory` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CoursesCategory" ADD COLUMN     "shortName" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "courses" TEXT[];

-- CreateTable
CREATE TABLE "Lessons" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Lessons_pkey" PRIMARY KEY ("id")
);
