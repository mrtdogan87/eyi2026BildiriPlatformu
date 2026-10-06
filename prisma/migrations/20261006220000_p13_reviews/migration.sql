-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "reviewVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ReviewRound" (
    "id" TEXT NOT NULL,
    "congressId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "mode" TEXT NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "sourceVersion" INTEGER NOT NULL,
    "sourceHash" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "content" JSONB NOT NULL,
    "criteria" JSONB NOT NULL,
    "anonymityChecked" BOOLEAN NOT NULL DEFAULT false,
    "fileMime" TEXT,
    "fileHash" TEXT,
    "fileContent" BYTEA,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewAssignment" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "reviewerName" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'INVITED',
    "inviteReason" TEXT NOT NULL,
    "responseReason" TEXT,
    "conflict" BOOLEAN,
    "respondedAt" TIMESTAMP(3),
    "draft" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewEvaluation" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "scores" JSONB NOT NULL,
    "recommendation" TEXT NOT NULL,
    "authorComment" TEXT NOT NULL,
    "internalComment" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "submittedByName" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "reason" TEXT,
    "evidenceName" TEXT,
    "evidenceMime" TEXT,
    "evidenceHash" TEXT,
    "evidence" BYTEA,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewDecision" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "feedbackTr" TEXT NOT NULL,
    "feedbackEn" TEXT NOT NULL,
    "publishReviews" BOOLEAN NOT NULL DEFAULT false,
    "sourceVersion" INTEGER NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "overrideIncomplete" BOOLEAN NOT NULL DEFAULT false,
    "revisionRequestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewDecision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReviewRound_congressId_status_idx" ON "ReviewRound"("congressId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewRound_submissionId_number_key" ON "ReviewRound"("submissionId", "number");

-- CreateIndex
CREATE INDEX "ReviewAssignment_reviewerId_status_idx" ON "ReviewAssignment"("reviewerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewAssignment_roundId_reviewerId_key" ON "ReviewAssignment"("roundId", "reviewerId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewEvaluation_assignmentId_key" ON "ReviewEvaluation"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewDecision_roundId_key" ON "ReviewDecision"("roundId");

-- AddForeignKey
ALTER TABLE "ReviewRound" ADD CONSTRAINT "ReviewRound_congressId_fkey" FOREIGN KEY ("congressId") REFERENCES "Congress"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewRound" ADD CONSTRAINT "ReviewRound_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewAssignment" ADD CONSTRAINT "ReviewAssignment_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "ReviewRound"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewAssignment" ADD CONSTRAINT "ReviewAssignment_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "PlatformUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewEvaluation" ADD CONSTRAINT "ReviewEvaluation_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ReviewAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewDecision" ADD CONSTRAINT "ReviewDecision_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "ReviewRound"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

