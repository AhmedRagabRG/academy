-- CreateEnum
CREATE TYPE "DocumentPolicyModule" AS ENUM ('ADMISSIONS', 'STUDENTS');

-- CreateTable
CREATE TABLE "DocumentRequirementPolicy" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "module" "DocumentPolicyModule" NOT NULL,
    "offeringId" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "updatedById" UUID,

    CONSTRAINT "DocumentRequirementPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentRequirementDefinition" (
    "id" UUID NOT NULL,
    "policyId" UUID NOT NULL,
    "stableKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "requiredAtStage" "AdmissionStatus",
    "multiple" BOOLEAN NOT NULL DEFAULT false,
    "allowedMimeTypes" TEXT[],
    "maximumBytes" INTEGER NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DocumentRequirementDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentRequirementPolicy_organizationId_module_idx" ON "DocumentRequirementPolicy"("organizationId", "module");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentRequirementDefinition_policyId_stableKey_key" ON "DocumentRequirementDefinition"("policyId", "stableKey");

-- AddForeignKey
ALTER TABLE "DocumentRequirementDefinition" ADD CONSTRAINT "DocumentRequirementDefinition_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "DocumentRequirementPolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Exactly one organization-wide default per module, and at most one override
-- per offering. Postgres treats NULLs as distinct in a unique index, so a plain
-- UNIQUE(organizationId, module, offeringId) would let duplicate defaults in.
CREATE UNIQUE INDEX "DocumentRequirementPolicy_default_key"
  ON "DocumentRequirementPolicy" ("organizationId", "module")
  WHERE "offeringId" IS NULL;

CREATE UNIQUE INDEX "DocumentRequirementPolicy_offering_key"
  ON "DocumentRequirementPolicy" ("organizationId", "module", "offeringId")
  WHERE "offeringId" IS NOT NULL;
