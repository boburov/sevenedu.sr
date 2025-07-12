-- DropForeignKey
ALTER TABLE "UserCourse" DROP CONSTRAINT "UserCourse_userId_fkey";

-- AddForeignKey
ALTER TABLE "UserCourse" ADD CONSTRAINT "UserCourse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
