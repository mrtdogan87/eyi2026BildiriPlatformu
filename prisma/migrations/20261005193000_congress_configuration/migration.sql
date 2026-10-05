-- CreateEnum
CREATE TYPE "DeliveryStage" AS ENUM ('ABSTRACT', 'FULL_TEXT');

-- AlterTable
ALTER TABLE "Congress" ADD COLUMN     "configVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "configuration" JSONB,
ADD COLUMN     "eventEndsAt" TIMESTAMP(3),
ADD COLUMN     "eventStartsAt" TIMESTAMP(3),
ADD COLUMN     "year" INTEGER;

-- CreateTable
CREATE TABLE "DeliveryException" (
    "id" TEXT NOT NULL,
    "congressId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "submissionId" TEXT,
    "stage" "DeliveryStage" NOT NULL,
    "reason" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliveryException_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeliveryException_congressId_email_stage_expiresAt_idx" ON "DeliveryException"("congressId", "email", "stage", "expiresAt");

-- AddForeignKey
ALTER TABLE "DeliveryException" ADD CONSTRAINT "DeliveryException_congressId_fkey" FOREIGN KEY ("congressId") REFERENCES "Congress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryException" ADD CONSTRAINT "DeliveryException_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryException" ADD CONSTRAINT "DeliveryException_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "PlatformUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

