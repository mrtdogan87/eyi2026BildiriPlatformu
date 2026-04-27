-- Payment redesign: tier-driven pricing managed by admin.
-- Drops legacy enum-based payment columns; existing data is test-only and discarded.

ALTER TABLE "Submission"
  DROP COLUMN IF EXISTS "paymentCategory";

DROP TYPE IF EXISTS "PaymentCategory";

CREATE TYPE "AudienceType" AS ENUM ('ACADEMIC', 'STUDENT');
CREATE TYPE "AttendeeRole" AS ENUM ('PRESENTER', 'LISTENER');

ALTER TABLE "Congress"
  ADD COLUMN "earlyDeadline"     TIMESTAMP(3),
  ADD COLUMN "lateDeadline"      TIMESTAMP(3),
  ADD COLUMN "galaFeeAmount"     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "galaFeeCurrency"   TEXT    NOT NULL DEFAULT 'EUR',
  ADD COLUMN "galaFeeNote"       TEXT,
  ADD COLUMN "bankName"          TEXT,
  ADD COLUMN "bankAccountHolder" TEXT,
  ADD COLUMN "bankIban"          TEXT,
  ADD COLUMN "bankBranch"        TEXT,
  ADD COLUMN "tripNote"          TEXT;

ALTER TABLE "Submission"
  ADD COLUMN "attendeeRole"     "AttendeeRole",
  ADD COLUMN "audience"         "AudienceType",
  ADD COLUMN "onlinePaperCount" INTEGER,
  ADD COLUMN "paymentTierId"    TEXT,
  ADD COLUMN "paymentCurrency"  TEXT,
  ADD COLUMN "galaFeeAmount"    INTEGER,
  ADD COLUMN "galaFeeCurrency"  TEXT;

CREATE TABLE "PaymentTier" (
  "id"               TEXT NOT NULL,
  "congressId"       TEXT NOT NULL,
  "presentationMode" "PresentationMode" NOT NULL,
  "role"             "AttendeeRole"     NOT NULL,
  "audience"         "AudienceType",
  "onlinePaperCount" INTEGER,
  "period"           "PaymentPeriod",
  "amount"           INTEGER          NOT NULL DEFAULT 0,
  "currency"         TEXT             NOT NULL DEFAULT 'TRY',
  "active"           BOOLEAN          NOT NULL DEFAULT true,
  "sortOrder"        INTEGER          NOT NULL DEFAULT 0,
  "createdAt"        TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3)     NOT NULL,
  CONSTRAINT "PaymentTier_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentTier_unique_combo"
  ON "PaymentTier"("congressId", "presentationMode", "role", "audience", "onlinePaperCount", "period");

CREATE INDEX "PaymentTier_congressId_active_idx"
  ON "PaymentTier"("congressId", "active");

ALTER TABLE "PaymentTier"
  ADD CONSTRAINT "PaymentTier_congressId_fkey"
  FOREIGN KEY ("congressId") REFERENCES "Congress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Submission"
  ADD CONSTRAINT "Submission_paymentTierId_fkey"
  FOREIGN KEY ("paymentTierId") REFERENCES "PaymentTier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed default tiers for every existing congress.
-- The amounts are placeholders that the admin updates from the panel.
DO $seed$
DECLARE
  congress_row RECORD;
BEGIN
  FOR congress_row IN SELECT "id" FROM "Congress" LOOP
    INSERT INTO "PaymentTier" ("id", "congressId", "presentationMode", "role", "audience", "onlinePaperCount", "period", "amount", "currency", "active", "sortOrder", "updatedAt") VALUES
      ('pt_'  || substr(md5(random()::text), 1, 24), congress_row."id", 'IN_PERSON', 'PRESENTER', 'ACADEMIC', NULL, 'EARLY', 3000, 'TRY', true, 10, CURRENT_TIMESTAMP),
      ('pt_'  || substr(md5(random()::text), 1, 24), congress_row."id", 'IN_PERSON', 'PRESENTER', 'ACADEMIC', NULL, 'LATE',  4000, 'TRY', true, 11, CURRENT_TIMESTAMP),
      ('pt_'  || substr(md5(random()::text), 1, 24), congress_row."id", 'IN_PERSON', 'PRESENTER', 'STUDENT',  NULL, 'EARLY', 2000, 'TRY', true, 20, CURRENT_TIMESTAMP),
      ('pt_'  || substr(md5(random()::text), 1, 24), congress_row."id", 'IN_PERSON', 'PRESENTER', 'STUDENT',  NULL, 'LATE',  3000, 'TRY', true, 21, CURRENT_TIMESTAMP),
      ('pt_'  || substr(md5(random()::text), 1, 24), congress_row."id", 'IN_PERSON', 'LISTENER',  'ACADEMIC', NULL, 'EARLY', 1500, 'TRY', true, 30, CURRENT_TIMESTAMP),
      ('pt_'  || substr(md5(random()::text), 1, 24), congress_row."id", 'IN_PERSON', 'LISTENER',  'ACADEMIC', NULL, 'LATE',  2000, 'TRY', true, 31, CURRENT_TIMESTAMP),
      ('pt_'  || substr(md5(random()::text), 1, 24), congress_row."id", 'IN_PERSON', 'LISTENER',  'STUDENT',  NULL, 'EARLY', 1000, 'TRY', true, 40, CURRENT_TIMESTAMP),
      ('pt_'  || substr(md5(random()::text), 1, 24), congress_row."id", 'IN_PERSON', 'LISTENER',  'STUDENT',  NULL, 'LATE',  1500, 'TRY', true, 41, CURRENT_TIMESTAMP),
      ('pt_'  || substr(md5(random()::text), 1, 24), congress_row."id", 'ONLINE',    'PRESENTER', NULL,       1,    NULL,    2000, 'TRY', true, 50, CURRENT_TIMESTAMP),
      ('pt_'  || substr(md5(random()::text), 1, 24), congress_row."id", 'ONLINE',    'PRESENTER', NULL,       2,    NULL,    3000, 'TRY', true, 51, CURRENT_TIMESTAMP),
      ('pt_'  || substr(md5(random()::text), 1, 24), congress_row."id", 'ONLINE',    'LISTENER',  NULL,       NULL, NULL,    0,    'TRY', true, 60, CURRENT_TIMESTAMP);

    UPDATE "Congress"
       SET "earlyDeadline" = TIMESTAMP '2026-08-01 20:59:59',
           "lateDeadline"  = TIMESTAMP '2026-08-30 20:59:59',
           "galaFeeAmount" = 45,
           "galaFeeCurrency" = 'EUR',
           "bankName" = COALESCE("bankName", 'Akbank Manisa Sanayi Şubesi'),
           "bankAccountHolder" = COALESCE("bankAccountHolder", 'Yaşam Boyu Bilim ve Eğitime Destek Derneği'),
           "bankIban" = COALESCE("bankIban", 'TR61 0004 6006 5988 8000 2325 51')
     WHERE "id" = congress_row."id";
  END LOOP;
END
$seed$;
