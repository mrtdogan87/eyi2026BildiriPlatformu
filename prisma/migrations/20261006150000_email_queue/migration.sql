-- CreateEnum
CREATE TYPE "EmailMessageStatus" AS ENUM ('PENDING', 'PROCESSING', 'RETRY', 'CAPTURED', 'ACCEPTED', 'PERMANENT_FAILURE', 'UNKNOWN', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EmailIssueStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateTable
CREATE TABLE "EmailSettings" (
    "congressId" TEXT NOT NULL,
    "replyTo" TEXT,
    "replyUrl" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailSettings_pkey" PRIMARY KEY ("congressId")
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "congressId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailMessage" (
    "id" TEXT NOT NULL,
    "congressId" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "module" "ModuleKey",
    "templateKey" TEXT NOT NULL,
    "templateVersion" INTEGER NOT NULL,
    "locale" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "replyTo" TEXT,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "status" "EmailMessageStatus" NOT NULL DEFAULT 'PENDING',
    "version" INTEGER NOT NULL DEFAULT 1,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAttemptAt" TIMESTAMP(3),
    "leaseToken" TEXT,
    "leaseUntil" TIMESTAMP(3),
    "provider" TEXT,
    "providerId" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailAttempt" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "errorCode" TEXT,
    "errorSummary" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailDeliveryIssue" (
    "id" TEXT NOT NULL,
    "congressId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "status" "EmailIssueStatus" NOT NULL DEFAULT 'OPEN',
    "version" INTEGER NOT NULL DEFAULT 1,
    "note" TEXT NOT NULL DEFAULT '',
    "resolution" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "EmailDeliveryIssue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_congressId_key_locale_key" ON "EmailTemplate"("congressId", "key", "locale");

-- CreateIndex
CREATE INDEX "EmailMessage_status_nextAttemptAt_idx" ON "EmailMessage"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "EmailMessage_status_leaseUntil_idx" ON "EmailMessage"("status", "leaseUntil");

-- CreateIndex
CREATE INDEX "EmailMessage_congressId_createdAt_idx" ON "EmailMessage"("congressId", "createdAt");

-- CreateIndex
CREATE INDEX "EmailMessage_congressId_sourceType_sourceId_idx" ON "EmailMessage"("congressId", "sourceType", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailMessage_congressId_dedupeKey_key" ON "EmailMessage"("congressId", "dedupeKey");

-- CreateIndex
CREATE UNIQUE INDEX "EmailAttempt_messageId_number_key" ON "EmailAttempt"("messageId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "EmailDeliveryIssue_messageId_key" ON "EmailDeliveryIssue"("messageId");

-- CreateIndex
CREATE INDEX "EmailDeliveryIssue_congressId_status_createdAt_idx" ON "EmailDeliveryIssue"("congressId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "EmailSettings" ADD CONSTRAINT "EmailSettings_congressId_fkey" FOREIGN KEY ("congressId") REFERENCES "Congress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_congressId_fkey" FOREIGN KEY ("congressId") REFERENCES "Congress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_congressId_fkey" FOREIGN KEY ("congressId") REFERENCES "Congress"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailAttempt" ADD CONSTRAINT "EmailAttempt_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "EmailMessage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailDeliveryIssue" ADD CONSTRAINT "EmailDeliveryIssue_congressId_fkey" FOREIGN KEY ("congressId") REFERENCES "Congress"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailDeliveryIssue" ADD CONSTRAINT "EmailDeliveryIssue_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "EmailMessage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailDeliveryIssue" ADD CONSTRAINT "EmailDeliveryIssue_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "PlatformUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
