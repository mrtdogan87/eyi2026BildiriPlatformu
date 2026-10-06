-- AlterTable
ALTER TABLE "Congress" ADD COLUMN     "programPublishedId" TEXT,
ADD COLUMN     "programVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ProgramRoom" (
    "id" TEXT NOT NULL,
    "congressId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ProgramRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramPerson" (
    "id" TEXT NOT NULL,
    "congressId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ProgramPerson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramSession" (
    "id" TEXT NOT NULL,
    "congressId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "titleTr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "requiresChair" BOOLEAN NOT NULL DEFAULT true,
    "requiresSupport" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "onlineVersion" INTEGER NOT NULL DEFAULT 0,
    "onlineEnabled" BOOLEAN NOT NULL DEFAULT false,
    "onlineUrl" TEXT NOT NULL DEFAULT '',
    "onlineOpensAt" TIMESTAMP(3),
    "onlineClosesAt" TIMESTAMP(3),
    "onlineAudience" TEXT NOT NULL DEFAULT 'PARTICIPANTS',
    "onlineForVersion" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProgramSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramTalk" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "presenterId" TEXT NOT NULL,
    "submissionId" TEXT,
    "sourceVersion" INTEGER,
    "sourceReviewVersion" INTEGER,
    "titleTr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ProgramTalk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramDuty" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INVITED',
    "version" INTEGER NOT NULL DEFAULT 0,
    "inviteReason" TEXT NOT NULL,
    "responseReason" TEXT,
    "replacedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "ProgramDuty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramPublication" (
    "id" TEXT NOT NULL,
    "congressId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "sourceVersion" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgramPublication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProgramRoom_congressId_name_key" ON "ProgramRoom"("congressId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramPerson_congressId_email_key" ON "ProgramPerson"("congressId", "email");

-- CreateIndex
CREATE INDEX "ProgramSession_congressId_active_startsAt_idx" ON "ProgramSession"("congressId", "active", "startsAt");

-- CreateIndex
CREATE INDEX "ProgramTalk_sessionId_active_idx" ON "ProgramTalk"("sessionId", "active");

-- CreateIndex
CREATE INDEX "ProgramTalk_submissionId_idx" ON "ProgramTalk"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramDuty_replacedById_key" ON "ProgramDuty"("replacedById");

-- CreateIndex
CREATE INDEX "ProgramDuty_sessionId_kind_status_idx" ON "ProgramDuty"("sessionId", "kind", "status");

-- CreateIndex
CREATE INDEX "ProgramDuty_personId_status_idx" ON "ProgramDuty"("personId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramPublication_congressId_number_key" ON "ProgramPublication"("congressId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "Congress_programPublishedId_key" ON "Congress"("programPublishedId");

-- AddForeignKey
ALTER TABLE "Congress" ADD CONSTRAINT "Congress_programPublishedId_fkey" FOREIGN KEY ("programPublishedId") REFERENCES "ProgramPublication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramRoom" ADD CONSTRAINT "ProgramRoom_congressId_fkey" FOREIGN KEY ("congressId") REFERENCES "Congress"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramPerson" ADD CONSTRAINT "ProgramPerson_congressId_fkey" FOREIGN KEY ("congressId") REFERENCES "Congress"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramSession" ADD CONSTRAINT "ProgramSession_congressId_fkey" FOREIGN KEY ("congressId") REFERENCES "Congress"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramSession" ADD CONSTRAINT "ProgramSession_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "ProgramRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramTalk" ADD CONSTRAINT "ProgramTalk_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ProgramSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramTalk" ADD CONSTRAINT "ProgramTalk_presenterId_fkey" FOREIGN KEY ("presenterId") REFERENCES "ProgramPerson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramTalk" ADD CONSTRAINT "ProgramTalk_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramDuty" ADD CONSTRAINT "ProgramDuty_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ProgramSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramDuty" ADD CONSTRAINT "ProgramDuty_personId_fkey" FOREIGN KEY ("personId") REFERENCES "ProgramPerson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramDuty" ADD CONSTRAINT "ProgramDuty_replacedById_fkey" FOREIGN KEY ("replacedById") REFERENCES "ProgramDuty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramPublication" ADD CONSTRAINT "ProgramPublication_congressId_fkey" FOREIGN KEY ("congressId") REFERENCES "Congress"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

