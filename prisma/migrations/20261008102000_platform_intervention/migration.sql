-- Additive: existing sessions keep no intervention authority until an explicit entry.
ALTER TABLE "PlatformSession" ADD COLUMN "interventionReason" TEXT,
ADD COLUMN "interventionStartedAt" TIMESTAMP(3);
