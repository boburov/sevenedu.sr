-- CreateEnum
CREATE TYPE "public"."SubscriptionType" AS ENUM ('MONTHLY', 'FULL_CHARGE', 'FREE');

-- AlterTable
ALTER TABLE "public"."UserCourse" ADD COLUMN     "subscription" "public"."SubscriptionType" NOT NULL DEFAULT 'FREE';
