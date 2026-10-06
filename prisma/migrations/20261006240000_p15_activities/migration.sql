-- AlterEnum
ALTER TYPE "ModuleKey" ADD VALUE 'ACTIVITIES';

-- CreateTable
CREATE TABLE "ActivityEvent" (
    "id" TEXT NOT NULL,
    "congressId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "titleTr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "descriptionTr" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "opensAt" TIMESTAMP(3) NOT NULL,
    "closesAt" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "bookingOpen" BOOLEAN NOT NULL DEFAULT false,
    "cancelledAt" TIMESTAMP(3),
    "programSessionId" TEXT,
    "programSourceVersion" INTEGER,
    "feeMinor" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "notifyParticipants" BOOLEAN NOT NULL DEFAULT false,
    "nextQueue" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityBooking" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "seats" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "queueNumber" INTEGER NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'tr',
    "feeMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "feeSource" TEXT NOT NULL,
    "registrationId" TEXT,
    "legacyKind" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityBookingEvent" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "actorId" TEXT,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityBookingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityEvent_congressId_published_startsAt_idx" ON "ActivityEvent"("congressId", "published", "startsAt");

-- CreateIndex
CREATE INDEX "ActivityBooking_eventId_status_queueNumber_idx" ON "ActivityBooking"("eventId", "status", "queueNumber");

-- CreateIndex
CREATE INDEX "ActivityBooking_email_idx" ON "ActivityBooking"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityBooking_eventId_email_key" ON "ActivityBooking"("eventId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityBooking_registrationId_legacyKind_key" ON "ActivityBooking"("registrationId", "legacyKind");

-- CreateIndex
CREATE UNIQUE INDEX "ActivityBookingEvent_bookingId_number_key" ON "ActivityBookingEvent"("bookingId", "number");

-- AddForeignKey
ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_congressId_fkey" FOREIGN KEY ("congressId") REFERENCES "Congress"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_programSessionId_fkey" FOREIGN KEY ("programSessionId") REFERENCES "ProgramSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityBooking" ADD CONSTRAINT "ActivityBooking_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "ActivityEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityBooking" ADD CONSTRAINT "ActivityBooking_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityBookingEvent" ADD CONSTRAINT "ActivityBookingEvent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "ActivityBooking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

