CREATE TABLE "PasswordRecoveryToken" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordRecoveryToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PasswordRecoveryToken_tokenHash_key" ON "PasswordRecoveryToken"("tokenHash");
CREATE INDEX "PasswordRecoveryToken_userId_idx" ON "PasswordRecoveryToken"("userId");
CREATE INDEX "PasswordRecoveryToken_expiresAt_idx" ON "PasswordRecoveryToken"("expiresAt");
ALTER TABLE "PasswordRecoveryToken" ADD CONSTRAINT "PasswordRecoveryToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "PlatformUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "RecoveryRateLimit" (
  "key" TEXT NOT NULL,
  "windowStartedAt" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RecoveryRateLimit_pkey" PRIMARY KEY ("key")
);
