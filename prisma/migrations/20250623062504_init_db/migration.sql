-- CreateTable
CREATE TABLE "VocabularyTestResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "correct" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,

    CONSTRAINT "VocabularyTestResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VocabularyTestResult_userId_date_key" ON "VocabularyTestResult"("userId", "date");

-- AddForeignKey
ALTER TABLE "VocabularyTestResult" ADD CONSTRAINT "VocabularyTestResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
