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
    "lessonsId" TEXT,

    CONSTRAINT "Quizs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Options" (
    "id" TEXT NOT NULL,
    "option1" TEXT NOT NULL,
    "option2" TEXT NOT NULL,
    "option3" TEXT NOT NULL,
    "currentOption" TEXT NOT NULL,
    "quizsId" TEXT NOT NULL,

    CONSTRAINT "Options_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Quessions" ADD CONSTRAINT "Quessions_lessonsId_fkey" FOREIGN KEY ("lessonsId") REFERENCES "Lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dictonary" ADD CONSTRAINT "Dictonary_lessonsId_fkey" FOREIGN KEY ("lessonsId") REFERENCES "Lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quizs" ADD CONSTRAINT "Quizs_lessonsId_fkey" FOREIGN KEY ("lessonsId") REFERENCES "Lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Options" ADD CONSTRAINT "Options_quizsId_fkey" FOREIGN KEY ("quizsId") REFERENCES "Quizs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
