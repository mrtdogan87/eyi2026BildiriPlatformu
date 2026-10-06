-- CreateTable
CREATE TABLE "BookOutput" (
    "id" TEXT NOT NULL,
    "congressId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "sourceFingerprint" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "content" BYTEA NOT NULL,
    "pages" INTEGER NOT NULL,
    "layout" JSONB NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publicationVersion" INTEGER NOT NULL DEFAULT 0,
    "actorId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookOutput_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookOutput_congressId_kind_locale_idx" ON "BookOutput"("congressId", "kind", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "BookOutput_congressId_number_key" ON "BookOutput"("congressId", "number");

-- AddForeignKey
ALTER TABLE "BookOutput" ADD CONSTRAINT "BookOutput_congressId_fkey" FOREIGN KEY ("congressId") REFERENCES "Congress"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

