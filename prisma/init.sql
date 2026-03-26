CREATE TABLE "Congress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "Submission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "congressId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "submissionLanguage" TEXT,
    "titleTr" TEXT,
    "titleEn" TEXT,
    "abstractTr" TEXT,
    "abstractEn" TEXT,
    "keywordsTr" TEXT,
    "keywordsEn" TEXT,
    "presentationMode" TEXT,
    "galaAttendance" BOOLEAN NOT NULL DEFAULT false,
    "galaAttendeeCount" INTEGER NOT NULL DEFAULT 0,
    "tripAttendance" BOOLEAN NOT NULL DEFAULT false,
    "tripAttendeeCount" INTEGER NOT NULL DEFAULT 0,
    "draftOwnerEmail" TEXT NOT NULL,
    "submittedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Submission_congressId_fkey" FOREIGN KEY ("congressId") REFERENCES "Congress" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "SubmissionAuthor" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "submissionId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "institution" TEXT,
    "country" TEXT,
    "isPresenter" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SubmissionAuthor_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "SubmissionFile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "submissionId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubmissionFile_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "SubmissionAccessToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "submissionId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubmissionAccessToken_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
