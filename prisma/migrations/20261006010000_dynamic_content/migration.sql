-- CreateEnum
CREATE TYPE "SiteRecordKind" AS ENUM ('PERSON', 'ORGANIZATION', 'COMMITTEE', 'TASK', 'SPEAKER', 'PANEL', 'VENUE', 'HOTEL', 'TRANSFER', 'TRIP', 'SPONSOR', 'ANNOUNCEMENT', 'NEWS', 'EVENT', 'GALLERY');

-- CreateTable
CREATE TABLE "SiteRecord" (
    "id" TEXT NOT NULL,
    "congressId" TEXT NOT NULL,
    "kind" "SiteRecordKind" NOT NULL,
    "internalName" TEXT NOT NULL,
    "draft" JSONB NOT NULL,
    "published" JSONB,
    "publishedVersion" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 1,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteRecordRevision" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "kind" "CmsRevisionKind" NOT NULL,
    "content" JSONB NOT NULL,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteRecordRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteRecordMedia" (
    "revisionId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,

    CONSTRAINT "SiteRecordMedia_pkey" PRIMARY KEY ("revisionId","mediaId")
);

-- CreateTable
CREATE TABLE "FeedbackRequest" (
    "id" TEXT NOT NULL,
    "congressId" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "noticeVersion" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "version" INTEGER NOT NULL DEFAULT 1,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedbackRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SiteRecord_congressId_kind_archived_idx" ON "SiteRecord"("congressId", "kind", "archived");

-- CreateIndex
CREATE UNIQUE INDEX "SiteRecordRevision_recordId_number_key" ON "SiteRecordRevision"("recordId", "number");

-- CreateIndex
CREATE INDEX "FeedbackRequest_congressId_status_createdAt_idx" ON "FeedbackRequest"("congressId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "FeedbackRequest_congressId_email_createdAt_idx" ON "FeedbackRequest"("congressId", "email", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FeedbackRequest_congressId_requestKey_key" ON "FeedbackRequest"("congressId", "requestKey");

-- AddForeignKey
ALTER TABLE "SiteRecord" ADD CONSTRAINT "SiteRecord_congressId_fkey" FOREIGN KEY ("congressId") REFERENCES "Congress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteRecordRevision" ADD CONSTRAINT "SiteRecordRevision_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "SiteRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteRecordMedia" ADD CONSTRAINT "SiteRecordMedia_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "SiteRecordRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteRecordMedia" ADD CONSTRAINT "SiteRecordMedia_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "CmsMedia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedbackRequest" ADD CONSTRAINT "FeedbackRequest_congressId_fkey" FOREIGN KEY ("congressId") REFERENCES "Congress"("id") ON DELETE CASCADE ON UPDATE CASCADE;
