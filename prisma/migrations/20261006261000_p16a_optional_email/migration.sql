-- Preserve every existing recipient; identity is independent from delivery address.
ALTER TABLE "CertificateRecipient" ADD COLUMN "identityKey" TEXT,
ADD COLUMN "recipientRef" TEXT NOT NULL DEFAULT '',
ALTER COLUMN "email" SET DEFAULT '';
UPDATE "CertificateRecipient" SET "identityKey" = 'email:' || lower("email");
ALTER TABLE "CertificateRecipient" ALTER COLUMN "identityKey" SET NOT NULL;
DROP INDEX "CertificateRecipient_templateId_email_role_contextKey_key";
CREATE UNIQUE INDEX "CertificateRecipient_templateId_identityKey_role_contextKey_key"
ON "CertificateRecipient"("templateId", "identityKey", "role", "contextKey");
