/*
  Warnings:

  - The values [TEMP] on the enum `SubscriptionType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."SubscriptionType_new" AS ENUM ('MONTHLY', 'FULL_CHARGE', 'FREE');
ALTER TABLE "public"."UserCourse" ALTER COLUMN "subscription" DROP DEFAULT;
ALTER TABLE "public"."UserCourse" ALTER COLUMN "subscription" TYPE "public"."SubscriptionType_new" USING ("subscription"::text::"public"."SubscriptionType_new");
ALTER TYPE "public"."SubscriptionType" RENAME TO "SubscriptionType_old";
ALTER TYPE "public"."SubscriptionType_new" RENAME TO "SubscriptionType";
DROP TYPE "public"."SubscriptionType_old";
ALTER TABLE "public"."UserCourse" ALTER COLUMN "subscription" SET DEFAULT 'FREE';
COMMIT;

-- AlterTable
CREATE SEQUENCE "public".lessons_order_seq;
ALTER TABLE "public"."Lessons" ALTER COLUMN "order" SET DEFAULT nextval('"public".lessons_order_seq');
ALTER SEQUENCE "public".lessons_order_seq OWNED BY "public"."Lessons"."order";
