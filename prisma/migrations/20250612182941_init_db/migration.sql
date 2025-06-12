-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "surname" TEXT,
    "phonenumber" TEXT,
    "password" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "profilePic" TEXT NOT NULL DEFAULT '',
    "coins" INTEGER NOT NULL DEFAULT 0,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "code" TEXT NOT NULL,
    "codeExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoursesCategory" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "thumbnail" TEXT NOT NULL,
    "goal" TEXT NOT NULL,

    CONSTRAINT "CoursesCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCourse" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCourseProgress" (
    "id" TEXT NOT NULL,
    "userCourseId" TEXT NOT NULL,
    "completedLessons" INTEGER NOT NULL DEFAULT 0,
    "totalLessons" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCourseProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lessons" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "videoUrl" TEXT NOT NULL,
    "coursesCategoryId" TEXT NOT NULL,

    CONSTRAINT "Lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonsId" TEXT NOT NULL,
    "watchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quizs" (
    "id" TEXT NOT NULL,
    "quiz" TEXT NOT NULL,
    "lessonsId" TEXT NOT NULL,
    "option1" TEXT NOT NULL,
    "option2" TEXT NOT NULL,
    "option3" TEXT NOT NULL,
    "currentOption" TEXT NOT NULL,

    CONSTRAINT "Quizs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonsId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dictonary" (
    "id" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "translated" TEXT NOT NULL,
    "lessonsId" TEXT NOT NULL,

    CONSTRAINT "Dictonary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabularyProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dictonaryId" TEXT NOT NULL,
    "learnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VocabularyProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserGift" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserGift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "lessonsWatched" INTEGER NOT NULL,
    "wordsLearned" INTEGER NOT NULL,
    "testsPassed" INTEGER NOT NULL,

    CONSTRAINT "DailyActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "courseId" TEXT,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationRecipient" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "NotificationRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationRead" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationRead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quessions" (
    "id" TEXT NOT NULL,
    "quession" TEXT NOT NULL,
    "lessonsId" TEXT NOT NULL,

    CONSTRAINT "Quessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MentorMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MentorMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserCourse_userId_courseId_key" ON "UserCourse"("userId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "LessonActivity_userId_lessonsId_key" ON "LessonActivity"("userId", "lessonsId");

-- CreateIndex
CREATE UNIQUE INDEX "QuizProgress_userId_lessonsId_key" ON "QuizProgress"("userId", "lessonsId");

-- CreateIndex
CREATE UNIQUE INDEX "VocabularyProgress_userId_dictonaryId_key" ON "VocabularyProgress"("userId", "dictonaryId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyActivityLog_date_key" ON "DailyActivityLog"("date");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationRecipient_userId_notificationId_key" ON "NotificationRecipient"("userId", "notificationId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationRead_userId_notificationId_key" ON "NotificationRead"("userId", "notificationId");

-- AddForeignKey
ALTER TABLE "UserCourse" ADD CONSTRAINT "UserCourse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCourse" ADD CONSTRAINT "UserCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "CoursesCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCourseProgress" ADD CONSTRAINT "UserCourseProgress_userCourseId_fkey" FOREIGN KEY ("userCourseId") REFERENCES "UserCourse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lessons" ADD CONSTRAINT "Lessons_coursesCategoryId_fkey" FOREIGN KEY ("coursesCategoryId") REFERENCES "CoursesCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonActivity" ADD CONSTRAINT "LessonActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonActivity" ADD CONSTRAINT "LessonActivity_lessonsId_fkey" FOREIGN KEY ("lessonsId") REFERENCES "Lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quizs" ADD CONSTRAINT "Quizs_lessonsId_fkey" FOREIGN KEY ("lessonsId") REFERENCES "Lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizProgress" ADD CONSTRAINT "QuizProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizProgress" ADD CONSTRAINT "QuizProgress_lessonsId_fkey" FOREIGN KEY ("lessonsId") REFERENCES "Lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dictonary" ADD CONSTRAINT "Dictonary_lessonsId_fkey" FOREIGN KEY ("lessonsId") REFERENCES "Lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyProgress" ADD CONSTRAINT "VocabularyProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyProgress" ADD CONSTRAINT "VocabularyProgress_dictonaryId_fkey" FOREIGN KEY ("dictonaryId") REFERENCES "Dictonary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGift" ADD CONSTRAINT "UserGift_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyActivityLog" ADD CONSTRAINT "DailyActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "CoursesCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRecipient" ADD CONSTRAINT "NotificationRecipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRecipient" ADD CONSTRAINT "NotificationRecipient_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRead" ADD CONSTRAINT "NotificationRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRead" ADD CONSTRAINT "NotificationRead_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quessions" ADD CONSTRAINT "Quessions_lessonsId_fkey" FOREIGN KEY ("lessonsId") REFERENCES "Lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorMessage" ADD CONSTRAINT "MentorMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
