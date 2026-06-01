-- Optional student certificate (öğrenci belgesi) uploaded alongside the receipt
CREATE TABLE "RegistrationStudentDocument" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "content" BYTEA,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistrationStudentDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RegistrationStudentDocument_registrationId_key" ON "RegistrationStudentDocument"("registrationId");

ALTER TABLE "RegistrationStudentDocument" ADD CONSTRAINT "RegistrationStudentDocument_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
