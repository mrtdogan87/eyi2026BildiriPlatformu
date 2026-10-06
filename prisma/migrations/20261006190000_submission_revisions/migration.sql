-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "correctionVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "FlowSession" (
    "id" TEXT NOT NULL,
    "congressId" TEXT NOT NULL,
    "submissionId" TEXT,
    "email" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "parentKind" TEXT,
    "parentId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlowSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionFileVersion" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "content" BYTEA NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubmissionFileVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionChangeLog" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "before" JSONB NOT NULL,
    "after" JSONB NOT NULL,
    "fields" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT NOT NULL,
    "evidenceName" TEXT,
    "evidenceMime" TEXT,
    "evidenceSize" INTEGER,
    "evidenceHash" TEXT,
    "evidence" BYTEA,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubmissionChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionRevisionRequest" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "version" INTEGER NOT NULL DEFAULT 1,
    "baseVersion" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "ownerEmail" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "submitterEmail" TEXT,
    "comment" TEXT,
    "fileName" TEXT,
    "fileMime" TEXT,
    "fileSize" INTEGER,
    "fileHash" TEXT,
    "content" BYTEA,
    "reviewedAt" TIMESTAMP(3),
    "reviewerId" TEXT,
    "reviewerName" TEXT,
    "reviewReason" TEXT,

    CONSTRAINT "SubmissionRevisionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionOutputUpdate" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "changeId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "resolvedById" TEXT,
    "resolvedByName" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubmissionOutputUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FlowSession_tokenHash_key" ON "FlowSession"("tokenHash");

-- CreateIndex
CREATE INDEX "FlowSession_congressId_email_scope_idx" ON "FlowSession"("congressId", "email", "scope");

-- CreateIndex
CREATE INDEX "FlowSession_parentKind_parentId_idx" ON "FlowSession"("parentKind", "parentId");

-- CreateIndex
CREATE UNIQUE INDEX "SubmissionFileVersion_submissionId_number_key" ON "SubmissionFileVersion"("submissionId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "SubmissionChangeLog_submissionId_number_key" ON "SubmissionChangeLog"("submissionId", "number");

-- CreateIndex
CREATE INDEX "SubmissionRevisionRequest_submissionId_status_idx" ON "SubmissionRevisionRequest"("submissionId", "status");

-- CreateIndex
CREATE INDEX "SubmissionOutputUpdate_submissionId_status_idx" ON "SubmissionOutputUpdate"("submissionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SubmissionOutputUpdate_changeId_kind_key" ON "SubmissionOutputUpdate"("changeId", "kind");

-- AddForeignKey
ALTER TABLE "FlowSession" ADD CONSTRAINT "FlowSession_congressId_fkey" FOREIGN KEY ("congressId") REFERENCES "Congress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlowSession" ADD CONSTRAINT "FlowSession_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionFileVersion" ADD CONSTRAINT "SubmissionFileVersion_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionChangeLog" ADD CONSTRAINT "SubmissionChangeLog_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionRevisionRequest" ADD CONSTRAINT "SubmissionRevisionRequest_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionOutputUpdate" ADD CONSTRAINT "SubmissionOutputUpdate_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionOutputUpdate" ADD CONSTRAINT "SubmissionOutputUpdate_changeId_fkey" FOREIGN KEY ("changeId") REFERENCES "SubmissionChangeLog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

