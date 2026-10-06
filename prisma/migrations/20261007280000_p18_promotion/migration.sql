-- AlterEnum
ALTER TYPE "ModuleKey" ADD VALUE 'PROMOTION';

-- CreateTable
CREATE TABLE "PromotionDesign" (
    "id" TEXT NOT NULL,
    "congressId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "settings" JSONB NOT NULL,
    "imageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromotionDesign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionRevision" (
    "id" TEXT NOT NULL,
    "designId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "settings" JSONB NOT NULL,
    "imageId" TEXT,
    "imageChecksum" TEXT,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromotionRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionImage" (
    "id" TEXT NOT NULL,
    "congressId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "content" BYTEA NOT NULL,
    "checksum" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "actorId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromotionImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionOutput" (
    "id" TEXT NOT NULL,
    "congressId" TEXT NOT NULL,
    "designId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "designVersion" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "sourceFingerprint" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "name" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "content" BYTEA NOT NULL,
    "checksum" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publicationVersion" INTEGER NOT NULL DEFAULT 0,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromotionOutput_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PromotionDesign_congressId_key" ON "PromotionDesign"("congressId");

-- CreateIndex
CREATE UNIQUE INDEX "PromotionRevision_designId_number_key" ON "PromotionRevision"("designId", "number");

-- CreateIndex
CREATE INDEX "PromotionImage_congressId_createdAt_idx" ON "PromotionImage"("congressId", "createdAt");

-- CreateIndex
CREATE INDEX "PromotionOutput_congressId_published_createdAt_idx" ON "PromotionOutput"("congressId", "published", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PromotionOutput_designId_number_key" ON "PromotionOutput"("designId", "number");

-- AddForeignKey
ALTER TABLE "PromotionDesign" ADD CONSTRAINT "PromotionDesign_congressId_fkey" FOREIGN KEY ("congressId") REFERENCES "Congress"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionDesign" ADD CONSTRAINT "PromotionDesign_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "PromotionImage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionRevision" ADD CONSTRAINT "PromotionRevision_designId_fkey" FOREIGN KEY ("designId") REFERENCES "PromotionDesign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionImage" ADD CONSTRAINT "PromotionImage_congressId_fkey" FOREIGN KEY ("congressId") REFERENCES "Congress"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionOutput" ADD CONSTRAINT "PromotionOutput_congressId_fkey" FOREIGN KEY ("congressId") REFERENCES "Congress"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromotionOutput" ADD CONSTRAINT "PromotionOutput_designId_fkey" FOREIGN KEY ("designId") REFERENCES "PromotionDesign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

