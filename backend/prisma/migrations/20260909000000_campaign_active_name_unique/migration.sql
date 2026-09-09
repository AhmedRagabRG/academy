-- Campaign names may be reused after the campaign holding them is soft
-- deleted. The blanket unique index on (organizationId, normalizedName)
-- did not know about `deletedAt`, so the database rejected a legitimate
-- reuse the service layer already permitted, once the app-level pre-check
-- lost a race to a concurrent write. Replace it with a plain lookup index
-- (matching the non-unique @@index Prisma now declares) plus a partial
-- unique index that only constrains active (non-deleted) rows.

-- The original campaign migration also created a required branchId column,
-- but the product's current organization-wide campaign model removed that
-- field from Prisma without a matching SQL migration. A database rebuilt from
-- migration history would therefore reject every campaign insert. Remove the
-- stale constraint/index/column before applying the current model's indexes.
ALTER TABLE "Campaign" DROP CONSTRAINT IF EXISTS "Campaign_branchId_fkey";
DROP INDEX IF EXISTS "Campaign_branchId_idx";
ALTER TABLE "Campaign" DROP COLUMN IF EXISTS "branchId";

-- DropIndex
ALTER TABLE "Campaign" DROP CONSTRAINT IF EXISTS "Campaign_organizationId_normalizedName_key";
DROP INDEX IF EXISTS "Campaign_organizationId_normalizedName_key";

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Campaign_organizationId_normalizedName_idx" ON "Campaign"("organizationId", "normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Campaign_organizationId_normalizedName_active_key" ON "Campaign"("organizationId", "normalizedName") WHERE "deletedAt" IS NULL;
