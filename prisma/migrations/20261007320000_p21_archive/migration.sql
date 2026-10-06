-- AlterEnum
ALTER TYPE "ModuleKey" ADD VALUE 'ARCHIVE';

-- AlterTable
ALTER TABLE "Congress" ADD COLUMN     "closedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ArchiveSettings" (
    "id" TEXT NOT NULL,
    "congressId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "publicEnabled" BOOLEAN NOT NULL DEFAULT false,
    "preserveCertificates" BOOLEAN NOT NULL DEFAULT false,
    "publishedNumber" INTEGER,
    "reviewAt" TIMESTAMP(3),
    "policyNote" TEXT NOT NULL DEFAULT '',
    "withdrawnBooks" JSONB NOT NULL DEFAULT '[]',
    "certificateSnapshot" JSONB NOT NULL DEFAULT '[]',
    "closedModules" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArchiveSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArchivePublication" (
    "id" TEXT NOT NULL,
    "congressId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "checksum" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArchivePublication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArchiveEvent" (
    "id" TEXT NOT NULL,
    "congressId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "detail" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArchiveEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArchiveSettings_congressId_key" ON "ArchiveSettings"("congressId");

-- CreateIndex
CREATE UNIQUE INDEX "ArchivePublication_congressId_number_key" ON "ArchivePublication"("congressId", "number");

-- CreateIndex
CREATE INDEX "ArchiveEvent_congressId_createdAt_idx" ON "ArchiveEvent"("congressId", "createdAt");

-- AddForeignKey
ALTER TABLE "ArchiveSettings" ADD CONSTRAINT "ArchiveSettings_congressId_fkey" FOREIGN KEY ("congressId") REFERENCES "Congress"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchivePublication" ADD CONSTRAINT "ArchivePublication_congressId_fkey" FOREIGN KEY ("congressId") REFERENCES "Congress"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArchiveEvent" ADD CONSTRAINT "ArchiveEvent_congressId_fkey" FOREIGN KEY ("congressId") REFERENCES "Congress"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

