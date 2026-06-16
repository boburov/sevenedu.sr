-- AlterTable
ALTER TABLE "User" ADD COLUMN     "currentStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "longestStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastStreakDate" TIMESTAMP(3),
ADD COLUMN     "streakStartedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Lessons" ADD COLUMN     "level" TEXT;
