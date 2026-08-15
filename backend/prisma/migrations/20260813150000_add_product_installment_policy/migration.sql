CREATE TYPE "InstallmentFrequency" AS ENUM ('WEEKLY', 'MONTHLY', 'BIMONTHLY');

ALTER TYPE "FinanceScheduleBasis" ADD VALUE IF NOT EXISTS 'WEEKLY';
ALTER TYPE "FinanceScheduleBasis" ADD VALUE IF NOT EXISTS 'BIMONTHLY';

ALTER TABLE "ProductPricing"
ADD COLUMN "installmentMinCount" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "installmentMaxCount" INTEGER NOT NULL DEFAULT 12,
ADD COLUMN "installmentFrequency" "InstallmentFrequency" NOT NULL DEFAULT 'MONTHLY';

ALTER TABLE "ProductPricing"
ADD CONSTRAINT "ProductPricing_installment_count_range_check"
CHECK (
  "installmentMinCount" >= 1
  AND "installmentMaxCount" >= "installmentMinCount"
  AND "installmentMaxCount" <= 60
);
