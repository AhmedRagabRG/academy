-- Durable claim leases, request-start tracking, a per-recipient correlation
-- marker, and a persistent cross-instance throttle gate for background
-- WhatsApp campaign delivery. See backend/src/modules/campaigns/dispatch.
--
-- Safety contract: a crash after the Graph API request started but before
-- the response is persisted is outcome-unknown and must never be retried
-- automatically. `UNCERTAIN` is the terminal state for that case.

-- AlterTable: CampaignRecipient — claim/lease/correlation columns.
ALTER TABLE "CampaignRecipient"
  ADD COLUMN "correlationId" UUID,
  ADD COLUMN "claimToken" UUID,
  ADD COLUMN "leaseExpiresAt" TIMESTAMPTZ,
  ADD COLUMN "requestStartedAt" TIMESTAMPTZ,
  ADD COLUMN "uncertainAt" TIMESTAMPTZ;

-- Backfill a stable correlation id for every row that predates this
-- migration so the NOT NULL + UNIQUE constraints below apply cleanly.
UPDATE "CampaignRecipient" SET "correlationId" = gen_random_uuid() WHERE "correlationId" IS NULL;

ALTER TABLE "CampaignRecipient" ALTER COLUMN "correlationId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CampaignRecipient_correlationId_key" ON "CampaignRecipient"("correlationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CampaignRecipient_status_leaseExpiresAt_idx" ON "CampaignRecipient"("status", "leaseExpiresAt");

-- AlterTable: Campaign — an honest uncertain counter plus a persistent,
-- cross-instance throttle gate (a fixed 60s window spend tracked in the
-- row itself, reserved atomically before any recipient is claimed).
ALTER TABLE "Campaign"
  ADD COLUMN "uncertainCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "throttleWindowStartedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "throttleWindowCount" INTEGER NOT NULL DEFAULT 0;

-- Rows left in SENDING by the pre-lease dispatcher have an unknowable
-- provider outcome: the old process may have crashed before or after Meta
-- accepted the request. Conservatively quarantine them rather than replaying
-- and risking a duplicate message.
UPDATE "CampaignRecipient"
SET status = 'UNCERTAIN',
    "uncertainAt" = CURRENT_TIMESTAMP,
    "errorCode" = 'legacy-inflight-outcome-unknown',
    "errorMessage" = 'تعذر تحديد نتيجة محاولة إرسال سابقة أثناء الترقية'
WHERE status = 'SENDING';

UPDATE "Campaign" AS campaign
SET "uncertainCount" = counts.total
FROM (
  SELECT "campaignId", COUNT(*)::INTEGER AS total
  FROM "CampaignRecipient"
  WHERE status = 'UNCERTAIN'
  GROUP BY "campaignId"
) AS counts
WHERE campaign.id = counts."campaignId";
