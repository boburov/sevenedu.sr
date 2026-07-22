-- AlterTable
ALTER TABLE "Certificate" ADD COLUMN     "number" SERIAL NOT NULL,
ADD COLUMN     "fullName" TEXT NOT NULL DEFAULT '';

-- Mavjud sertifikatlarga egasining ismini yozib qo'yamiz, so'ng DEFAULT olib
-- tashlanadi: bundan keyin ism har doim aniq berilishi shart.
UPDATE "Certificate" c
SET "fullName" = btrim(concat_ws(' ', u."name", u."surname"))
FROM "User" u
WHERE u."id" = c."userId";

ALTER TABLE "Certificate" ALTER COLUMN "fullName" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_number_key" ON "Certificate"("number");
