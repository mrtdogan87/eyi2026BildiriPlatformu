ALTER TYPE "SubmissionStatus" ADD VALUE IF NOT EXISTS 'UNDER_REVIEW';
ALTER TYPE "SubmissionStatus" ADD VALUE IF NOT EXISTS 'ACCEPTED';
ALTER TYPE "SubmissionStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

CREATE TABLE "SubmissionStatusHistory" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "fromStatus" "SubmissionStatus",
    "toStatus" "SubmissionStatus" NOT NULL,
    "note" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubmissionStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SubmissionStatusHistory_submissionId_changedAt_idx"
ON "SubmissionStatusHistory"("submissionId", "changedAt");

ALTER TABLE "SubmissionStatusHistory"
ADD CONSTRAINT "SubmissionStatusHistory_submissionId_fkey"
FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
