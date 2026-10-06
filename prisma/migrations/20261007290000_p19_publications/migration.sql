-- AlterEnum
ALTER TYPE "ModuleKey" ADD VALUE 'PUBLICATIONS';

-- CreateTable
CREATE TABLE "PublicationCalendar" (
    "id" TEXT NOT NULL,
    "congressId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "calendar" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicationCalendar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicationItem" (
    "id" TEXT NOT NULL,
    "congressId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "submissionId" TEXT,
    "ownerEmail" TEXT NOT NULL,
    "sourceSelection" JSONB NOT NULL,
    "sourceSnapshot" JSONB NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "preferences" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicationFile" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mime" TEXT NOT NULL DEFAULT 'application/pdf',
    "content" BYTEA NOT NULL,
    "checksum" TEXT NOT NULL,
    "pages" INTEGER NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicationFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicationProof" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "fileId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "sourceFingerprint" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicationProof_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicationApproval" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "proofId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "approved" BOOLEAN NOT NULL,
    "proofHash" TEXT NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "actorId" TEXT,
    "parentSessionId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicationApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicationDecision" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "proofId" TEXT NOT NULL,
    "approvalId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "ready" BOOLEAN NOT NULL,
    "sourceFingerprint" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "actorId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicationDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicationReferral" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "proofId" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "actorId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicationReferral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicationEvent" (
    "id" TEXT NOT NULL,
    "congressId" TEXT NOT NULL,
    "itemId" TEXT,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "detail" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PublicationCalendar_congressId_key" ON "PublicationCalendar"("congressId");

-- CreateIndex
CREATE INDEX "PublicationItem_congressId_ownerEmail_idx" ON "PublicationItem"("congressId", "ownerEmail");

-- CreateIndex
CREATE UNIQUE INDEX "PublicationItem_congressId_key_key" ON "PublicationItem"("congressId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "PublicationFile_itemId_number_key" ON "PublicationFile"("itemId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "PublicationProof_itemId_number_key" ON "PublicationProof"("itemId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "PublicationApproval_itemId_number_key" ON "PublicationApproval"("itemId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "PublicationDecision_itemId_number_key" ON "PublicationDecision"("itemId", "number");

-- CreateIndex
CREATE INDEX "PublicationReferral_itemId_createdAt_idx" ON "PublicationReferral"("itemId", "createdAt");

-- CreateIndex
CREATE INDEX "PublicationEvent_congressId_createdAt_idx" ON "PublicationEvent"("congressId", "createdAt");

-- AddForeignKey
ALTER TABLE "PublicationCalendar" ADD CONSTRAINT "PublicationCalendar_congressId_fkey" FOREIGN KEY ("congressId") REFERENCES "Congress"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicationItem" ADD CONSTRAINT "PublicationItem_congressId_fkey" FOREIGN KEY ("congressId") REFERENCES "Congress"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicationItem" ADD CONSTRAINT "PublicationItem_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicationFile" ADD CONSTRAINT "PublicationFile_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "PublicationItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicationProof" ADD CONSTRAINT "PublicationProof_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "PublicationItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicationProof" ADD CONSTRAINT "PublicationProof_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "PublicationFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicationApproval" ADD CONSTRAINT "PublicationApproval_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "PublicationItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicationApproval" ADD CONSTRAINT "PublicationApproval_proofId_fkey" FOREIGN KEY ("proofId") REFERENCES "PublicationProof"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicationDecision" ADD CONSTRAINT "PublicationDecision_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "PublicationItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicationDecision" ADD CONSTRAINT "PublicationDecision_proofId_fkey" FOREIGN KEY ("proofId") REFERENCES "PublicationProof"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicationDecision" ADD CONSTRAINT "PublicationDecision_approvalId_fkey" FOREIGN KEY ("approvalId") REFERENCES "PublicationApproval"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicationReferral" ADD CONSTRAINT "PublicationReferral_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "PublicationItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicationReferral" ADD CONSTRAINT "PublicationReferral_proofId_fkey" FOREIGN KEY ("proofId") REFERENCES "PublicationProof"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicationEvent" ADD CONSTRAINT "PublicationEvent_congressId_fkey" FOREIGN KEY ("congressId") REFERENCES "Congress"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicationEvent" ADD CONSTRAINT "PublicationEvent_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "PublicationItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

