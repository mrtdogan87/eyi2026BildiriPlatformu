-- Split submission from registration: payment + receipt + social fields move to
-- separate Registration tree. Test-stage data discarded.

ALTER TABLE "Submission" DROP CONSTRAINT IF EXISTS "Submission_paymentTierId_fkey";

DROP TABLE IF EXISTS "SubmissionPaymentReceipt";

ALTER TABLE "Submission"
  DROP COLUMN IF EXISTS "attendeeRole",
  DROP COLUMN IF EXISTS "paperOrder",
  DROP COLUMN IF EXISTS "paymentTierId",
  DROP COLUMN IF EXISTS "paymentPeriod",
  DROP COLUMN IF EXISTS "paymentAmount",
  DROP COLUMN IF EXISTS "paymentCurrency",
  DROP COLUMN IF EXISTS "paymentDescription",
  DROP COLUMN IF EXISTS "galaAttendance",
  DROP COLUMN IF EXISTS "galaAttendeeCount",
  DROP COLUMN IF EXISTS "galaFeeAmount",
  DROP COLUMN IF EXISTS "galaFeeCurrency",
  DROP COLUMN IF EXISTS "tripAttendance",
  DROP COLUMN IF EXISTS "tripAttendeeCount";

CREATE TYPE "RegistrationKind" AS ENUM ('PAPERS', 'LISTENER');

CREATE TABLE "Registration" (
  "id"                       TEXT NOT NULL,
  "congressId"               TEXT NOT NULL,
  "email"                    TEXT NOT NULL,
  "kind"                     "RegistrationKind" NOT NULL,
  "audience"                 "AudienceType",
  "listenerPresentationMode" "PresentationMode",
  "galaAttendance"           BOOLEAN NOT NULL DEFAULT false,
  "galaAttendeeCount"        INTEGER NOT NULL DEFAULT 0,
  "galaFeeAmount"            INTEGER,
  "galaFeeCurrency"          TEXT,
  "tripAttendance"           BOOLEAN NOT NULL DEFAULT false,
  "tripAttendeeCount"        INTEGER NOT NULL DEFAULT 0,
  "paymentPeriod"            "PaymentPeriod" NOT NULL,
  "totalAmount"              INTEGER NOT NULL,
  "currency"                 TEXT NOT NULL DEFAULT 'TRY',
  "paymentDescription"       TEXT NOT NULL,
  "paidAt"                   TIMESTAMP(3),
  "createdAt"                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"                TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Registration_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Registration_congressId_email_idx" ON "Registration"("congressId", "email");
CREATE INDEX "Registration_email_idx" ON "Registration"("email");

ALTER TABLE "Registration"
  ADD CONSTRAINT "Registration_congressId_fkey"
  FOREIGN KEY ("congressId") REFERENCES "Congress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "RegistrationPaperItem" (
  "id"             TEXT NOT NULL,
  "registrationId" TEXT NOT NULL,
  "submissionId"   TEXT NOT NULL,
  "paperOrder"     INTEGER NOT NULL,
  "amount"         INTEGER NOT NULL,
  "currency"       TEXT NOT NULL,
  "tierId"         TEXT,
  CONSTRAINT "RegistrationPaperItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RegistrationPaperItem_submissionId_key"
  ON "RegistrationPaperItem"("submissionId");

CREATE INDEX "RegistrationPaperItem_registrationId_idx"
  ON "RegistrationPaperItem"("registrationId");

ALTER TABLE "RegistrationPaperItem"
  ADD CONSTRAINT "RegistrationPaperItem_registrationId_fkey"
  FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RegistrationPaperItem"
  ADD CONSTRAINT "RegistrationPaperItem_submissionId_fkey"
  FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RegistrationPaperItem"
  ADD CONSTRAINT "RegistrationPaperItem_tierId_fkey"
  FOREIGN KEY ("tierId") REFERENCES "PaymentTier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "RegistrationReceipt" (
  "id"             TEXT NOT NULL,
  "registrationId" TEXT NOT NULL,
  "originalName"   TEXT NOT NULL,
  "mimeType"       TEXT NOT NULL,
  "fileSize"       INTEGER NOT NULL,
  "storageKey"     TEXT NOT NULL,
  "content"        BYTEA,
  "uploadedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RegistrationReceipt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RegistrationReceipt_registrationId_key"
  ON "RegistrationReceipt"("registrationId");

ALTER TABLE "RegistrationReceipt"
  ADD CONSTRAINT "RegistrationReceipt_registrationId_fkey"
  FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "RegistrationAccessToken" (
  "id"         TEXT NOT NULL,
  "congressId" TEXT NOT NULL,
  "email"      TEXT NOT NULL,
  "tokenHash"  TEXT NOT NULL,
  "expiresAt"  TIMESTAMP(3) NOT NULL,
  "usedAt"     TIMESTAMP(3),
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RegistrationAccessToken_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RegistrationAccessToken_email_idx"
  ON "RegistrationAccessToken"("email");

CREATE INDEX "RegistrationAccessToken_tokenHash_idx"
  ON "RegistrationAccessToken"("tokenHash");

CREATE INDEX "RegistrationAccessToken_expiresAt_idx"
  ON "RegistrationAccessToken"("expiresAt");

ALTER TABLE "RegistrationAccessToken"
  ADD CONSTRAINT "RegistrationAccessToken_congressId_fkey"
  FOREIGN KEY ("congressId") REFERENCES "Congress"("id") ON DELETE CASCADE ON UPDATE CASCADE;
