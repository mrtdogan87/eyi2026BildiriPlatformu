-- AlterEnum
ALTER TYPE "ModuleKey" ADD VALUE 'AWARDS';

-- CreateTable
CREATE TABLE "AwardCategory" (
    "id" TEXT NOT NULL,
    "congressId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "decisionVersion" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AwardCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AwardCategoryRevision" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "settings" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL,
    "actorId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AwardCategoryRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AwardEntry" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "sourceType" TEXT NOT NULL,
    "submissionId" TEXT,
    "sourceSelection" JSONB NOT NULL,
    "sourceSnapshot" JSONB NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "applicantEmail" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AwardEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AwardFile" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "content" BYTEA NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'AWARD_ONLY',
    "actorId" TEXT,
    "actorEmail" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AwardFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AwardAssignment" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "juryId" TEXT NOT NULL,
    "juryName" TEXT NOT NULL,
    "juryEmail" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'INVITED',
    "conflict" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT NOT NULL,
    "draft" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AwardAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AwardEvaluation" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "categoryVersion" INTEGER NOT NULL,
    "sourceFingerprint" TEXT NOT NULL,
    "scores" JSONB NOT NULL,
    "summary" JSONB NOT NULL,
    "comment" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AwardEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AwardDecision" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "categoryVersion" INTEGER NOT NULL,
    "sourceFingerprint" TEXT NOT NULL,
    "winners" JSONB NOT NULL,
    "snapshot" JSONB NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AwardDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AwardEvent" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "assignmentId" TEXT,
    "action" TEXT NOT NULL,
    "detail" JSONB NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AwardEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AwardCategory_congressId_active_idx" ON "AwardCategory"("congressId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "AwardCategoryRevision_categoryId_number_key" ON "AwardCategoryRevision"("categoryId", "number");

-- CreateIndex
CREATE INDEX "AwardEntry_applicantEmail_idx" ON "AwardEntry"("applicantEmail");

-- CreateIndex
CREATE UNIQUE INDEX "AwardEntry_categoryId_key_key" ON "AwardEntry"("categoryId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "AwardFile_entryId_number_key" ON "AwardFile"("entryId", "number");

-- CreateIndex
CREATE INDEX "AwardAssignment_juryId_idx" ON "AwardAssignment"("juryId");

-- CreateIndex
CREATE UNIQUE INDEX "AwardAssignment_entryId_juryId_key" ON "AwardAssignment"("entryId", "juryId");

-- CreateIndex
CREATE UNIQUE INDEX "AwardEvaluation_assignmentId_number_key" ON "AwardEvaluation"("assignmentId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "AwardDecision_categoryId_number_key" ON "AwardDecision"("categoryId", "number");

-- CreateIndex
CREATE INDEX "AwardEvent_entryId_createdAt_idx" ON "AwardEvent"("entryId", "createdAt");

-- AddForeignKey
ALTER TABLE "AwardCategory" ADD CONSTRAINT "AwardCategory_congressId_fkey" FOREIGN KEY ("congressId") REFERENCES "Congress"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AwardCategoryRevision" ADD CONSTRAINT "AwardCategoryRevision_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AwardCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AwardEntry" ADD CONSTRAINT "AwardEntry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AwardCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AwardEntry" ADD CONSTRAINT "AwardEntry_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AwardFile" ADD CONSTRAINT "AwardFile_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "AwardEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AwardAssignment" ADD CONSTRAINT "AwardAssignment_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "AwardEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AwardEvaluation" ADD CONSTRAINT "AwardEvaluation_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "AwardAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AwardDecision" ADD CONSTRAINT "AwardDecision_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AwardCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AwardEvent" ADD CONSTRAINT "AwardEvent_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "AwardEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AwardEvent" ADD CONSTRAINT "AwardEvent_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "AwardAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

