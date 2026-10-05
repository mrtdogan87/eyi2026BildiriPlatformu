-- CreateEnum
CREATE TYPE "CmsRevisionKind" AS ENUM ('SAVE', 'PUBLISH', 'RESTORE', 'WITHDRAW');

-- CreateEnum
CREATE TYPE "CmsMediaKind" AS ENUM ('IMAGE', 'PDF');

-- CreateTable
CREATE TABLE "CmsPage" (
    "id" TEXT NOT NULL,
    "congressId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "internalName" TEXT NOT NULL,
    "draft" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "publishedRevisionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CmsPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmsRevision" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "kind" "CmsRevisionKind" NOT NULL,
    "content" JSONB NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CmsRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmsMedia" (
    "id" TEXT NOT NULL,
    "congressId" TEXT NOT NULL,
    "internalName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "kind" "CmsMediaKind" NOT NULL,
    "mimeType" TEXT NOT NULL,
    "content" BYTEA NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "byteSize" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CmsMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmsRevisionMedia" (
    "revisionId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,

    CONSTRAINT "CmsRevisionMedia_pkey" PRIMARY KEY ("revisionId","mediaId")
);

-- CreateIndex
CREATE UNIQUE INDEX "CmsPage_publishedRevisionId_key" ON "CmsPage"("publishedRevisionId");

-- CreateIndex
CREATE UNIQUE INDEX "CmsPage_congressId_slug_key" ON "CmsPage"("congressId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "CmsRevision_pageId_number_key" ON "CmsRevision"("pageId", "number");

-- CreateIndex
CREATE INDEX "CmsMedia_congressId_createdAt_idx" ON "CmsMedia"("congressId", "createdAt");

-- AddForeignKey
ALTER TABLE "CmsPage" ADD CONSTRAINT "CmsPage_publishedRevisionId_fkey" FOREIGN KEY ("publishedRevisionId") REFERENCES "CmsRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsPage" ADD CONSTRAINT "CmsPage_congressId_fkey" FOREIGN KEY ("congressId") REFERENCES "Congress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsRevision" ADD CONSTRAINT "CmsRevision_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "PlatformUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsRevision" ADD CONSTRAINT "CmsRevision_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "CmsPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsMedia" ADD CONSTRAINT "CmsMedia_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "PlatformUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsMedia" ADD CONSTRAINT "CmsMedia_congressId_fkey" FOREIGN KEY ("congressId") REFERENCES "Congress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsRevisionMedia" ADD CONSTRAINT "CmsRevisionMedia_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "CmsRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsRevisionMedia" ADD CONSTRAINT "CmsRevisionMedia_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "CmsMedia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
