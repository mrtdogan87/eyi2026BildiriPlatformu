-- Per-paper pricing redesign: presentation mode no longer affects presenter pricing;
-- presenters pay per paper (first / second). Test data is discarded.

DROP INDEX IF EXISTS "PaymentTier_unique_combo";

ALTER TABLE "Submission"
  DROP CONSTRAINT IF EXISTS "Submission_paymentTierId_fkey";

DELETE FROM "PaymentTier";

ALTER TABLE "PaymentTier"
  RENAME COLUMN "onlinePaperCount" TO "paperOrder";

ALTER TABLE "PaymentTier"
  ALTER COLUMN "presentationMode" DROP NOT NULL;

ALTER TABLE "Submission"
  RENAME COLUMN "onlinePaperCount" TO "paperOrder";

UPDATE "Submission"
   SET "paymentTierId"      = NULL,
       "paymentPeriod"      = NULL,
       "paymentAmount"      = NULL,
       "paymentCurrency"    = NULL,
       "paymentDescription" = NULL,
       "paperOrder"         = NULL;

DELETE FROM "SubmissionPaymentReceipt";

CREATE UNIQUE INDEX "PaymentTier_unique_combo"
  ON "PaymentTier"("congressId", "presentationMode", "role", "audience", "paperOrder", "period");

ALTER TABLE "Submission"
  ADD CONSTRAINT "Submission_paymentTierId_fkey"
  FOREIGN KEY ("paymentTierId") REFERENCES "PaymentTier"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed new tier matrix per congress.
DO $seed$
DECLARE
  congress_row RECORD;
BEGIN
  FOR congress_row IN SELECT "id" FROM "Congress" LOOP
    INSERT INTO "PaymentTier" ("id", "congressId", "presentationMode", "role", "audience", "paperOrder", "period", "amount", "currency", "active", "sortOrder", "updatedAt") VALUES
      -- Presenter tiers (presentationMode NULL: yüz yüze ve çevrim içi aynı ücret)
      ('pt_' || substr(md5(random()::text), 1, 24), congress_row."id", NULL, 'PRESENTER', 'ACADEMIC', 1, 'EARLY', 4000, 'TRY', true, 10, CURRENT_TIMESTAMP),
      ('pt_' || substr(md5(random()::text), 1, 24), congress_row."id", NULL, 'PRESENTER', 'ACADEMIC', 1, 'LATE',  5000, 'TRY', true, 11, CURRENT_TIMESTAMP),
      ('pt_' || substr(md5(random()::text), 1, 24), congress_row."id", NULL, 'PRESENTER', 'ACADEMIC', 2, 'EARLY', 2000, 'TRY', true, 12, CURRENT_TIMESTAMP),
      ('pt_' || substr(md5(random()::text), 1, 24), congress_row."id", NULL, 'PRESENTER', 'ACADEMIC', 2, 'LATE',  2500, 'TRY', true, 13, CURRENT_TIMESTAMP),
      ('pt_' || substr(md5(random()::text), 1, 24), congress_row."id", NULL, 'PRESENTER', 'STUDENT',  1, 'EARLY', 3000, 'TRY', true, 20, CURRENT_TIMESTAMP),
      ('pt_' || substr(md5(random()::text), 1, 24), congress_row."id", NULL, 'PRESENTER', 'STUDENT',  1, 'LATE',  4000, 'TRY', true, 21, CURRENT_TIMESTAMP),
      ('pt_' || substr(md5(random()::text), 1, 24), congress_row."id", NULL, 'PRESENTER', 'STUDENT',  2, 'EARLY', 1500, 'TRY', true, 22, CURRENT_TIMESTAMP),
      ('pt_' || substr(md5(random()::text), 1, 24), congress_row."id", NULL, 'PRESENTER', 'STUDENT',  2, 'LATE',  2000, 'TRY', true, 23, CURRENT_TIMESTAMP),
      -- In-person listener tiers (audience-dependent)
      ('pt_' || substr(md5(random()::text), 1, 24), congress_row."id", 'IN_PERSON', 'LISTENER', 'ACADEMIC', NULL, 'EARLY', 2000, 'TRY', true, 30, CURRENT_TIMESTAMP),
      ('pt_' || substr(md5(random()::text), 1, 24), congress_row."id", 'IN_PERSON', 'LISTENER', 'ACADEMIC', NULL, 'LATE',  2500, 'TRY', true, 31, CURRENT_TIMESTAMP),
      ('pt_' || substr(md5(random()::text), 1, 24), congress_row."id", 'IN_PERSON', 'LISTENER', 'STUDENT',  NULL, 'EARLY', 1500, 'TRY', true, 32, CURRENT_TIMESTAMP),
      ('pt_' || substr(md5(random()::text), 1, 24), congress_row."id", 'IN_PERSON', 'LISTENER', 'STUDENT',  NULL, 'LATE',  2000, 'TRY', true, 33, CURRENT_TIMESTAMP),
      -- Online listener (free, no audience/period distinction)
      ('pt_' || substr(md5(random()::text), 1, 24), congress_row."id", 'ONLINE',    'LISTENER', NULL,       NULL, NULL,    0,    'TRY', true, 40, CURRENT_TIMESTAMP);
  END LOOP;
END
$seed$;
