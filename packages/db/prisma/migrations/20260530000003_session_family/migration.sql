-- Migration: session family tracking and revocation reason
-- Adds familyId (reuse-detection chain) and revokedReason to RefreshSession

ALTER TABLE "RefreshSession" ADD COLUMN "familyId"      TEXT NOT NULL DEFAULT '';
ALTER TABLE "RefreshSession" ADD COLUMN "revokedReason"  TEXT;

-- Back-fill: every existing session becomes the root of its own family
UPDATE "RefreshSession" SET "familyId" = "id" WHERE "familyId" = '';

-- Index for efficient family-wide revocation queries
CREATE INDEX "RefreshSession_familyId_idx" ON "RefreshSession"("familyId");
