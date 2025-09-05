-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('USER', 'ADMIN', 'CREATOR');

-- DropForeignKey
ALTER TABLE "public"."Certificate" DROP CONSTRAINT "Certificate_courseId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Dictonary" DROP CONSTRAINT "Dictonary_lessonsId_fkey";

-- DropForeignKey
ALTER TABLE "public"."LessonActivity" DROP CONSTRAINT "LessonActivity_courseId_fkey";

-- DropForeignKey
ALTER TABLE "public"."LessonActivity" DROP CONSTRAINT "LessonActivity_lessonsId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Lessons" DROP CONSTRAINT "Lessons_coursesCategoryId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Notification" DROP CONSTRAINT "Notification_courseId_fkey";

-- DropForeignKey
ALTER TABLE "public"."NotificationRead" DROP CONSTRAINT "NotificationRead_notificationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Quessions" DROP CONSTRAINT "Quessions_lessonsId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Quizs" DROP CONSTRAINT "Quizs_lessonsId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserCourse" DROP CONSTRAINT "UserCourse_courseId_fkey";

-- AlterTable
ALTER TABLE "public"."Lessons" ADD COLUMN     "isVisible" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "role" "public"."UserRole" NOT NULL DEFAULT 'USER';

-- AddForeignKey
ALTER TABLE "public"."UserCourse" ADD CONSTRAINT "UserCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."CoursesCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Lessons" ADD CONSTRAINT "Lessons_coursesCategoryId_fkey" FOREIGN KEY ("coursesCategoryId") REFERENCES "public"."CoursesCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LessonActivity" ADD CONSTRAINT "LessonActivity_lessonsId_fkey" FOREIGN KEY ("lessonsId") REFERENCES "public"."Lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LessonActivity" ADD CONSTRAINT "LessonActivity_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."CoursesCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Quizs" ADD CONSTRAINT "Quizs_lessonsId_fkey" FOREIGN KEY ("lessonsId") REFERENCES "public"."Lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Dictonary" ADD CONSTRAINT "Dictonary_lessonsId_fkey" FOREIGN KEY ("lessonsId") REFERENCES "public"."Lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."CoursesCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NotificationRead" ADD CONSTRAINT "NotificationRead_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "public"."Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Quessions" ADD CONSTRAINT "Quessions_lessonsId_fkey" FOREIGN KEY ("lessonsId") REFERENCES "public"."Lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Certificate" ADD CONSTRAINT "Certificate_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."CoursesCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
