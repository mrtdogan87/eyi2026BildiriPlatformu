CREATE TYPE "PaymentCategory" AS ENUM ('ACADEMIC', 'STUDENT', 'ONLINE_ONE', 'ONLINE_TWO');
CREATE TYPE "PaymentPeriod" AS ENUM ('EARLY', 'LATE');

ALTER TABLE "Submission"
ADD COLUMN "paymentCategory" "PaymentCategory",
ADD COLUMN "paymentPeriod" "PaymentPeriod",
ADD COLUMN "paymentAmount" INTEGER,
ADD COLUMN "paymentDescription" TEXT;

CREATE TABLE "SubmissionPaymentReceipt" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "content" BYTEA,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubmissionPaymentReceipt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SubmissionPaymentReceipt_submissionId_key"
ON "SubmissionPaymentReceipt"("submissionId");

ALTER TABLE "SubmissionPaymentReceipt"
ADD CONSTRAINT "SubmissionPaymentReceipt_submissionId_fkey"
FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
