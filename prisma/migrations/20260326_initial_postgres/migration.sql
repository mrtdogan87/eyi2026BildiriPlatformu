CREATE TYPE "SubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED');
CREATE TYPE "SubmissionLanguage" AS ENUM ('TR', 'EN');
CREATE TYPE "PresentationMode" AS ENUM ('ONLINE', 'IN_PERSON');

CREATE TABLE "Congress" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Congress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "congressId" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "submissionLanguage" "SubmissionLanguage",
    "titleTr" TEXT,
    "titleEn" TEXT,
    "abstractTr" TEXT,
    "abstractEn" TEXT,
    "keywordsTr" TEXT,
    "keywordsEn" TEXT,
    "presentationMode" "PresentationMode",
    "galaAttendance" BOOLEAN NOT NULL DEFAULT false,
    "galaAttendeeCount" INTEGER NOT NULL DEFAULT 0,
    "tripAttendance" BOOLEAN NOT NULL DEFAULT false,
    "tripAttendeeCount" INTEGER NOT NULL DEFAULT 0,
    "draftOwnerEmail" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SubmissionAuthor" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "institution" TEXT,
    "country" TEXT,
    "isPresenter" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SubmissionAuthor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SubmissionFile" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubmissionFile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SubmissionAccessToken" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubmissionAccessToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Congress_slug_key" ON "Congress"("slug");
CREATE INDEX "Submission_congressId_status_idx" ON "Submission"("congressId", "status");
CREATE INDEX "Submission_draftOwnerEmail_idx" ON "Submission"("draftOwnerEmail");
CREATE INDEX "SubmissionAuthor_submissionId_idx" ON "SubmissionAuthor"("submissionId");
CREATE INDEX "SubmissionAuthor_email_idx" ON "SubmissionAuthor"("email");
CREATE UNIQUE INDEX "SubmissionAuthor_submissionId_email_key" ON "SubmissionAuthor"("submissionId", "email");
CREATE UNIQUE INDEX "SubmissionFile_submissionId_key" ON "SubmissionFile"("submissionId");
CREATE INDEX "SubmissionAccessToken_submissionId_idx" ON "SubmissionAccessToken"("submissionId");
CREATE INDEX "SubmissionAccessToken_email_idx" ON "SubmissionAccessToken"("email");
CREATE INDEX "SubmissionAccessToken_expiresAt_idx" ON "SubmissionAccessToken"("expiresAt");

ALTER TABLE "Submission"
ADD CONSTRAINT "Submission_congressId_fkey"
FOREIGN KEY ("congressId") REFERENCES "Congress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SubmissionAuthor"
ADD CONSTRAINT "SubmissionAuthor_submissionId_fkey"
FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SubmissionFile"
ADD CONSTRAINT "SubmissionFile_submissionId_fkey"
FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SubmissionAccessToken"
ADD CONSTRAINT "SubmissionAccessToken_submissionId_fkey"
FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
