-- AlterEnum
ALTER TYPE "CmsMediaKind" ADD VALUE 'WORD_TEMPLATE';

-- AlterTable
ALTER TABLE "CmsPage" ADD COLUMN     "archived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "templateKey" TEXT;

-- CreateTable
CREATE TABLE "CmsPageAlias" (
    "id" TEXT NOT NULL,
    "congressId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,

    CONSTRAINT "CmsPageAlias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CmsPageAlias_pageId_idx" ON "CmsPageAlias"("pageId");

-- CreateIndex
CREATE UNIQUE INDEX "CmsPageAlias_congressId_slug_key" ON "CmsPageAlias"("congressId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "CmsPage_congressId_templateKey_key" ON "CmsPage"("congressId", "templateKey");

-- AddForeignKey
ALTER TABLE "CmsPageAlias" ADD CONSTRAINT "CmsPageAlias_congressId_fkey" FOREIGN KEY ("congressId") REFERENCES "Congress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsPageAlias" ADD CONSTRAINT "CmsPageAlias_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "CmsPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

