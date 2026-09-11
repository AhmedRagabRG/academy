-- Reintroduces branches, dropped by 20260909164212 along with the academic
-- modules. Branch is an access-control boundary: an account with branchIds set
-- sees only rows in those branches.
--
-- Two defaults make this safe to add to a populated database:
--   * Account.branchIds defaults to an empty array, which the policy layer
--     treats as unrestricted. Every existing account keeps the access it has.
--   * Every branchId column is nullable and starts null, and a null branch is
--     visible to everyone. Otherwise every row predating branches would become
--     invisible the moment this ran.
CREATE TABLE "Branch" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "status" "EntityStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Branch_organizationId_code_key" ON "Branch"("organizationId", "code");
CREATE UNIQUE INDEX "Branch_organizationId_name_key" ON "Branch"("organizationId", "name");
CREATE INDEX "Branch_organizationId_status_idx" ON "Branch"("organizationId", "status");

ALTER TABLE "Branch" ADD CONSTRAINT "Branch_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Account" ADD COLUMN "branchIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "Ticket" ADD COLUMN "branchId" UUID;
CREATE INDEX "Ticket_organizationId_branchId_status_idx" ON "Ticket"("organizationId", "branchId", "status");

ALTER TABLE "Contact" ADD COLUMN "branchId" UUID;
CREATE INDEX "Contact_organizationId_branchId_idx" ON "Contact"("organizationId", "branchId");
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AiTicketRoutingRule" ADD COLUMN "branchId" UUID;
