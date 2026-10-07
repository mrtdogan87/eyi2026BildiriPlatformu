-- Preserve the previous attendance setting for every existing congress.
INSERT INTO "CongressModule" ("id", "congressId", "key", "enabled")
SELECT 'attendance_' || c."id", c."id", 'ATTENDANCE'::"ModuleKey", COALESCE(p."enabled", false)
FROM "Congress" c
LEFT JOIN "CongressModule" p ON p."congressId" = c."id" AND p."key" = 'PROGRAM'
ON CONFLICT ("congressId", "key") DO NOTHING;

-- Closed congresses must restore attendance along with their former program
-- setting when reopened; no current closed module is enabled by this migration.
UPDATE "ArchiveSettings"
SET "closedModules" = "closedModules" || '["ATTENDANCE"]'::jsonb
WHERE jsonb_typeof("closedModules") = 'array'
  AND "closedModules" @> '["PROGRAM"]'::jsonb
  AND NOT "closedModules" @> '["ATTENDANCE"]'::jsonb;

CREATE TABLE "CertificateType" (
  "id" TEXT NOT NULL,
  "congressId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "baseRole" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CertificateType_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CertificateType_congressId_fkey" FOREIGN KEY ("congressId") REFERENCES "Congress"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CertificateType_congressId_key_key" ON "CertificateType"("congressId", "key");
CREATE UNIQUE INDEX "CertificateType_congressId_name_key" ON "CertificateType"("congressId", "name");
