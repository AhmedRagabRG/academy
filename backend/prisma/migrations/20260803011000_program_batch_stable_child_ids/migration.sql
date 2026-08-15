ALTER TABLE "BatchInstallmentPlan"
  ADD COLUMN IF NOT EXISTS "externalId" UUID;
UPDATE "BatchInstallmentPlan" SET "externalId" = "id" WHERE "externalId" IS NULL;
ALTER TABLE "BatchInstallmentPlan" ALTER COLUMN "externalId" SET NOT NULL;

ALTER TABLE "BatchInstallment"
  ADD COLUMN IF NOT EXISTS "externalId" UUID;
UPDATE "BatchInstallment" SET "externalId" = "id" WHERE "externalId" IS NULL;
ALTER TABLE "BatchInstallment" ALTER COLUMN "externalId" SET NOT NULL;

ALTER TABLE "BatchOffer"
  ADD COLUMN IF NOT EXISTS "externalId" UUID;
UPDATE "BatchOffer" SET "externalId" = "id" WHERE "externalId" IS NULL;
ALTER TABLE "BatchOffer" ALTER COLUMN "externalId" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "BatchInstallmentPlan_financialRevisionId_externalId_key"
  ON "BatchInstallmentPlan"("financialRevisionId", "externalId");
CREATE UNIQUE INDEX IF NOT EXISTS "BatchInstallment_installmentPlanId_externalId_key"
  ON "BatchInstallment"("installmentPlanId", "externalId");
CREATE UNIQUE INDEX IF NOT EXISTS "BatchOffer_financialRevisionId_externalId_key"
  ON "BatchOffer"("financialRevisionId", "externalId");
