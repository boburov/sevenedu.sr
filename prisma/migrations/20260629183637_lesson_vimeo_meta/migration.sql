-- AlterTable: offline download (Vimeo) metadata for Lessons
ALTER TABLE "Lessons" ADD COLUMN "vimeoId" TEXT;
ALTER TABLE "Lessons" ADD COLUMN "durationSec" INTEGER;
ALTER TABLE "Lessons" ADD COLUMN "sizeBytes" BIGINT;
ALTER TABLE "Lessons" ADD COLUMN "downloadable" BOOLEAN NOT NULL DEFAULT false;
