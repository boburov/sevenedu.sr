-- AlterTable
ALTER TABLE "User" ADD COLUMN     "energy" INTEGER NOT NULL DEFAULT 200,
ADD COLUMN     "energyRefillAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "EnergyTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "coinsSpent" INTEGER NOT NULL DEFAULT 0,
    "balance" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnergyTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EnergyTransaction_userId_createdAt_idx" ON "EnergyTransaction"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "EnergyTransaction" ADD CONSTRAINT "EnergyTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
