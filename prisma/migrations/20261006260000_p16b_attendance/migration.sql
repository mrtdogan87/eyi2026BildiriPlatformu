-- CreateTable
CREATE TABLE "CertificateRule" (
    "id" TEXT NOT NULL,
    "congressId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "settings" JSONB NOT NULL,

    CONSTRAINT "CertificateRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificateRuleRevision" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "settings" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CertificateRuleRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRecord" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "contextKey" TEXT NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "sourceFingerprint" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceEvent" (
    "id" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "sourceFingerprint" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CertificateRule_congressId_role_key" ON "CertificateRule"("congressId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "CertificateRuleRevision_ruleId_number_key" ON "CertificateRuleRevision"("ruleId", "number");

-- CreateIndex
CREATE INDEX "AttendanceRecord_email_idx" ON "AttendanceRecord"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceRecord_sessionId_email_kind_contextKey_key" ON "AttendanceRecord"("sessionId", "email", "kind", "contextKey");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceEvent_attendanceId_number_key" ON "AttendanceEvent"("attendanceId", "number");

-- AddForeignKey
ALTER TABLE "CertificateRule" ADD CONSTRAINT "CertificateRule_congressId_fkey" FOREIGN KEY ("congressId") REFERENCES "Congress"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateRuleRevision" ADD CONSTRAINT "CertificateRuleRevision_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "CertificateRule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ProgramSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceEvent" ADD CONSTRAINT "AttendanceEvent_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "AttendanceRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

