-- Security hardening: add account lockout fields, token versioning, and refresh session table

-- Add new security fields to User
ALTER TABLE "User" ADD COLUMN "tokenVersion"       INTEGER   NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "failedLoginCount"   INTEGER   NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "lockedUntil"        TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN   NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "lastLoginAt"        TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "passwordChangedAt"  TIMESTAMP(3);

-- Create RefreshSession table for revocable refresh tokens
CREATE TABLE "RefreshSession" (
  "id"              TEXT         NOT NULL,
  "userId"          TEXT         NOT NULL,
  "tokenHash"       TEXT         NOT NULL,
  "userAgent"       TEXT,
  "ipAddress"       TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt"       TIMESTAMP(3) NOT NULL,
  "revokedAt"       TIMESTAMP(3),
  "replacedByToken" TEXT,
  CONSTRAINT "RefreshSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RefreshSession_tokenHash_key" ON "RefreshSession"("tokenHash");
CREATE INDEX "RefreshSession_userId_idx"    ON "RefreshSession"("userId");
CREATE INDEX "RefreshSession_tokenHash_idx" ON "RefreshSession"("tokenHash");
CREATE INDEX "RefreshSession_expiresAt_idx" ON "RefreshSession"("expiresAt");

ALTER TABLE "RefreshSession"
  ADD CONSTRAINT "RefreshSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
