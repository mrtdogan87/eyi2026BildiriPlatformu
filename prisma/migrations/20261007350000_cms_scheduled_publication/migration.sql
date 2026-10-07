CREATE TYPE "CmsPublicationScheduleStatus" AS ENUM ('PENDING', 'PUBLISHED', 'CANCELLED', 'BLOCKED');
CREATE TABLE "CmsPublicationSchedule" (
  "id" TEXT NOT NULL,
  "congressId" TEXT NOT NULL,
  "pageId" TEXT NOT NULL,
  "sourceRevisionId" TEXT NOT NULL,
  "sourceVersion" INTEGER NOT NULL,
  "sourceHash" TEXT NOT NULL,
  "dueAt" TIMESTAMP(3) NOT NULL,
  "status" "CmsPublicationScheduleStatus" NOT NULL DEFAULT 'PENDING',
  "actorId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "outcomeReason" TEXT,
  "finishedAt" TIMESTAMP(3),
  "publishedRevisionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CmsPublicationSchedule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CmsPublicationSchedule_sourceVersion_check" CHECK ("sourceVersion" > 0),
  CONSTRAINT "CmsPublicationSchedule_sourceHash_check" CHECK ("sourceHash" ~ '^[a-f0-9]{64}$')
);
CREATE UNIQUE INDEX "CmsPublicationSchedule_publishedRevisionId_key" ON "CmsPublicationSchedule"("publishedRevisionId");
CREATE UNIQUE INDEX "CmsPublicationSchedule_one_pending_page" ON "CmsPublicationSchedule"("pageId") WHERE "status"='PENDING';
CREATE INDEX "CmsPublicationSchedule_status_dueAt_idx" ON "CmsPublicationSchedule"("status", "dueAt");
CREATE INDEX "CmsPublicationSchedule_pageId_createdAt_idx" ON "CmsPublicationSchedule"("pageId", "createdAt");
CREATE INDEX "CmsPublicationSchedule_congressId_status_idx" ON "CmsPublicationSchedule"("congressId", "status");
ALTER TABLE "CmsPublicationSchedule" ADD CONSTRAINT "CmsPublicationSchedule_congressId_fkey" FOREIGN KEY ("congressId") REFERENCES "Congress"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CmsPublicationSchedule" ADD CONSTRAINT "CmsPublicationSchedule_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "CmsPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CmsPublicationSchedule" ADD CONSTRAINT "CmsPublicationSchedule_sourceRevisionId_fkey" FOREIGN KEY ("sourceRevisionId") REFERENCES "CmsRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CmsPublicationSchedule" ADD CONSTRAINT "CmsPublicationSchedule_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "PlatformUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CmsPublicationSchedule" ADD CONSTRAINT "CmsPublicationSchedule_publishedRevisionId_fkey" FOREIGN KEY ("publishedRevisionId") REFERENCES "CmsRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;
