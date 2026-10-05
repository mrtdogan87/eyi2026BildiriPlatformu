-- CreateEnum
CREATE TYPE "SiteAssetKind" AS ENUM ('LOGO', 'HERO');

-- AlterTable
ALTER TABLE "Congress" ADD COLUMN     "siteConfiguration" JSONB,
ADD COLUMN     "siteVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "SiteAsset" (
    "id" TEXT NOT NULL,
    "congressId" TEXT NOT NULL,
    "kind" "SiteAssetKind" NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "content" BYTEA NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SiteAsset_congressId_kind_key" ON "SiteAsset"("congressId", "kind");

-- AddForeignKey
ALTER TABLE "SiteAsset" ADD CONSTRAINT "SiteAsset_congressId_fkey" FOREIGN KEY ("congressId") REFERENCES "Congress"("id") ON DELETE CASCADE ON UPDATE CASCADE;
