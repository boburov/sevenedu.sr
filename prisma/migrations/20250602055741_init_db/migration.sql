-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "surname" TEXT,
    "phonenumber" TEXT,
    "profilePic" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL,
    "password" TEXT,
    "courses" TEXT[],
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
CREATE TABLE "Lessons" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "videoUrl" TEXT NOT NULL,
    "coursesCategoryId" TEXT NOT NULL,

    CONSTRAINT "Lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quessions" (
    "id" TEXT NOT NULL,
    "quession" TEXT NOT NULL,
    "lessonsId" TEXT NOT NULL,

    CONSTRAINT "Quessions_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE UNIQUE INDEX "User_phonenumber_key" ON "User"("phonenumber");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Lessons" ADD CONSTRAINT "Lessons_coursesCategoryId_fkey" FOREIGN KEY ("coursesCategoryId") REFERENCES "CoursesCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quessions" ADD CONSTRAINT "Quessions_lessonsId_fkey" FOREIGN KEY ("lessonsId") REFERENCES "Lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dictonary" ADD CONSTRAINT "Dictonary_lessonsId_fkey" FOREIGN KEY ("lessonsId") REFERENCES "Lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quizs" ADD CONSTRAINT "Quizs_lessonsId_fkey" FOREIGN KEY ("lessonsId") REFERENCES "Lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
