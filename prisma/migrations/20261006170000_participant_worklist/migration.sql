-- CreateEnum
CREATE TYPE "WorkRequestKind" AS ENUM ('WITHDRAWAL_REQUEST', 'CANCELLATION_REQUEST', 'MANUAL_EMAIL', 'QUESTION');

-- CreateEnum
CREATE TYPE "WorkRequestStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'WAITING', 'RESOLVED');

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "structuredAbstract" JSONB;

-- CreateTable
CREATE TABLE "WorkRequest" (
    "id" TEXT NOT NULL,
    "congressId" TEXT NOT NULL,
    "requestKey" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "kind" "WorkRequestKind" NOT NULL,
    "origin" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requesterEmail" TEXT NOT NULL,
    "requesterName" TEXT,
    "requesterUserId" TEXT,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "sourceModule" "ModuleKey",
    "assigneeId" TEXT,
    "status" "WorkRequestStatus" NOT NULL DEFAULT 'NEW',
    "publicResult" TEXT NOT NULL DEFAULT '',
    "internalNote" TEXT NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "WorkRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkRequestEvent" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "fromStatus" "WorkRequestStatus",
    "toStatus" "WorkRequestStatus" NOT NULL,
    "assigneeId" TEXT,
    "publicResult" TEXT NOT NULL DEFAULT '',
    "internalNote" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkRequestEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParticipantAccessToken" (
    "id" TEXT NOT NULL,
    "congressId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParticipantAccessToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParticipantSession" (
    "id" TEXT NOT NULL,
    "congressId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParticipantSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeclarationAcceptance" (
    "id" TEXT NOT NULL,
    "congressId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "texts" JSONB NOT NULL,
    "rules" JSONB NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeclarationAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkRequest_congressId_status_updatedAt_idx" ON "WorkRequest"("congressId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "WorkRequest_congressId_assigneeId_status_idx" ON "WorkRequest"("congressId", "assigneeId", "status");

-- CreateIndex
CREATE INDEX "WorkRequest_congressId_requesterEmail_createdAt_idx" ON "WorkRequest"("congressId", "requesterEmail", "createdAt");

-- CreateIndex
CREATE INDEX "WorkRequest_congressId_sourceType_sourceId_idx" ON "WorkRequest"("congressId", "sourceType", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkRequest_congressId_requestKey_key" ON "WorkRequest"("congressId", "requestKey");

-- CreateIndex
CREATE UNIQUE INDEX "WorkRequestEvent_requestId_number_key" ON "WorkRequestEvent"("requestId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "ParticipantAccessToken_tokenHash_key" ON "ParticipantAccessToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ParticipantAccessToken_congressId_email_expiresAt_idx" ON "ParticipantAccessToken"("congressId", "email", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ParticipantSession_tokenHash_key" ON "ParticipantSession"("tokenHash");

-- CreateIndex
CREATE INDEX "ParticipantSession_congressId_email_expiresAt_idx" ON "ParticipantSession"("congressId", "email", "expiresAt");

-- CreateIndex
CREATE INDEX "DeclarationAcceptance_congressId_email_acceptedAt_idx" ON "DeclarationAcceptance"("congressId", "email", "acceptedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DeclarationAcceptance_entityType_entityId_key" ON "DeclarationAcceptance"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "WorkRequest" ADD CONSTRAINT "WorkRequest_congressId_fkey" FOREIGN KEY ("congressId") REFERENCES "Congress"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkRequest" ADD CONSTRAINT "WorkRequest_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "PlatformUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkRequest" ADD CONSTRAINT "WorkRequest_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "PlatformUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkRequest" ADD CONSTRAINT "WorkRequest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "PlatformUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkRequest" ADD CONSTRAINT "WorkRequest_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "PlatformUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkRequestEvent" ADD CONSTRAINT "WorkRequestEvent_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "WorkRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkRequestEvent" ADD CONSTRAINT "WorkRequestEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "PlatformUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantAccessToken" ADD CONSTRAINT "ParticipantAccessToken_congressId_fkey" FOREIGN KEY ("congressId") REFERENCES "Congress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipantSession" ADD CONSTRAINT "ParticipantSession_congressId_fkey" FOREIGN KEY ("congressId") REFERENCES "Congress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeclarationAcceptance" ADD CONSTRAINT "DeclarationAcceptance_congressId_fkey" FOREIGN KEY ("congressId") REFERENCES "Congress"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
