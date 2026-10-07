ALTER TABLE "CongressMembership" ADD COLUMN "roles" "CongressRole"[] NOT NULL DEFAULT ARRAY[]::"CongressRole"[];
UPDATE "CongressMembership" SET "roles" = ARRAY["role"];
ALTER TABLE "EmailMessage" ALTER COLUMN "congressId" DROP NOT NULL;
CREATE UNIQUE INDEX "EmailMessage_platform_dedupe" ON "EmailMessage" ("dedupeKey") WHERE "congressId" IS NULL;
CREATE TABLE "PlatformSettings" (
 "id" TEXT NOT NULL DEFAULT 'platform', "displayName" TEXT NOT NULL DEFAULT 'Kongre Yönetim Platformu',
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "PlatformSettings_pkey" PRIMARY KEY ("id")
);
