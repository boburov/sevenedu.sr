/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Certificate` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,courseId]` on the table `Certificate` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Certificate" DROP COLUMN "createdAt",
ADD COLUMN     "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_userId_courseId_key" ON "Certificate"("userId", "courseId");
