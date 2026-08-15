CREATE TYPE "BatchStatus" AS ENUM ('DRAFT', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'STUDYING', 'GRADUATED', 'ARCHIVED');
CREATE TYPE "BatchBranchRole" AS ENUM ('REGISTRATION', 'STUDY');
CREATE TYPE "InstallmentBasis" AS ENUM ('AMOUNT', 'PERCENTAGE');
CREATE TYPE "CoveredCharge" AS ENUM ('PROGRAM_PRICE', 'REGISTRATION_FEE', 'COMBINED');
CREATE TYPE "BatchOfferKind" AS ENUM ('DISCOUNT', 'SCHOLARSHIP');
CREATE TYPE "BatchValueType" AS ENUM ('AMOUNT', 'PERCENTAGE');
CREATE TYPE "ConfigurationStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TABLE "ProgramBatch" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" UUID NOT NULL,
  "programId" UUID NOT NULL,
  "nameAr" TEXT NOT NULL,
  "nameEn" TEXT,
  "normalizedNameAr" TEXT NOT NULL,
  "normalizedNameEn" TEXT,
  "code" TEXT NOT NULL,
  "academicYearId" UUID NOT NULL,
  "intakeId" UUID NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "registrationStartDate" DATE,
  "registrationEndDate" DATE,
  "studyStartDate" DATE,
  "studyEndDate" DATE,
  "graduationDate" DATE,
  "maximumStudents" INTEGER NOT NULL,
  "status" "BatchStatus" NOT NULL DEFAULT 'DRAFT',
  "codeLockedAt" TIMESTAMPTZ,
  "currentFinancialRevisionId" UUID,
  "version" INTEGER NOT NULL DEFAULT 1,
  "archivedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy" UUID NOT NULL,
  "updatedBy" UUID NOT NULL,
  CONSTRAINT "ProgramBatch_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProgramBatch_capacity_check" CHECK ("maximumStudents" > 0),
  CONSTRAINT "ProgramBatch_version_check" CHECK ("version" > 0),
  CONSTRAINT "ProgramBatch_registration_dates_check" CHECK ("registrationStartDate" IS NULL OR "registrationEndDate" IS NULL OR "registrationEndDate" > "registrationStartDate"),
  CONSTRAINT "ProgramBatch_study_dates_check" CHECK ("studyStartDate" IS NULL OR "studyEndDate" IS NULL OR "studyEndDate" > "studyStartDate"),
  CONSTRAINT "ProgramBatch_registration_study_check" CHECK ("registrationEndDate" IS NULL OR "studyStartDate" IS NULL OR "studyStartDate" >= "registrationEndDate"),
  CONSTRAINT "ProgramBatch_graduation_check" CHECK ("studyEndDate" IS NULL OR "graduationDate" IS NULL OR "graduationDate" >= "studyEndDate")
);

CREATE TABLE "BatchBranchAssignment" (
  "batchId" UUID NOT NULL,
  "branchId" UUID NOT NULL,
  "role" "BatchBranchRole" NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy" UUID NOT NULL,
  CONSTRAINT "BatchBranchAssignment_pkey" PRIMARY KEY ("batchId", "branchId", "role")
);

CREATE TABLE "BatchFinancialRevision" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "batchId" UUID NOT NULL,
  "revisionNumber" INTEGER NOT NULL,
  "programPriceMinor" BIGINT NOT NULL,
  "programPriceCurrency" TEXT NOT NULL,
  "programPricePrecision" INTEGER NOT NULL,
  "registrationFeeMinor" BIGINT NOT NULL,
  "registrationFeeCurrency" TEXT NOT NULL,
  "registrationFeePrecision" INTEGER NOT NULL,
  "installmentsEnabled" BOOLEAN NOT NULL DEFAULT false,
  "sourceBatchVersion" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy" UUID NOT NULL,
  CONSTRAINT "BatchFinancialRevision_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BatchFinancialRevision_values_check" CHECK ("revisionNumber" > 0 AND "sourceBatchVersion" > 0 AND "programPriceMinor" >= 0 AND "registrationFeeMinor" >= 0 AND "programPricePrecision" BETWEEN 0 AND 6 AND "registrationFeePrecision" BETWEEN 0 AND 6)
);

CREATE TABLE "BatchInstallmentPlan" (
  "id" UUID NOT NULL,
  "externalId" UUID NOT NULL,
  "financialRevisionId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "basis" "InstallmentBasis" NOT NULL,
  "coveredCharge" "CoveredCharge" NOT NULL,
  "status" "ConfigurationStatus" NOT NULL DEFAULT 'ACTIVE',
  "position" INTEGER NOT NULL,
  CONSTRAINT "BatchInstallmentPlan_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BatchInstallmentPlan_position_check" CHECK ("position" > 0)
);

CREATE TABLE "BatchInstallment" (
  "id" UUID NOT NULL,
  "externalId" UUID NOT NULL,
  "installmentPlanId" UUID NOT NULL,
  "label" TEXT NOT NULL,
  "valueMinor" BIGINT NOT NULL,
  "valuePrecision" INTEGER NOT NULL,
  "milestone" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  CONSTRAINT "BatchInstallment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BatchInstallment_value_check" CHECK ("valueMinor" > 0 AND "valuePrecision" BETWEEN 0 AND 6 AND "position" > 0)
);

CREATE TABLE "BatchOffer" (
  "id" UUID NOT NULL,
  "externalId" UUID NOT NULL,
  "financialRevisionId" UUID NOT NULL,
  "kind" "BatchOfferKind" NOT NULL,
  "name" TEXT NOT NULL,
  "valueType" "BatchValueType" NOT NULL,
  "valueMinor" BIGINT NOT NULL,
  "valuePrecision" INTEGER NOT NULL,
  "currency" TEXT,
  "startDate" DATE,
  "endDate" DATE,
  "status" "ConfigurationStatus" NOT NULL DEFAULT 'ACTIVE',
  "position" INTEGER NOT NULL,
  CONSTRAINT "BatchOffer_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BatchOffer_value_check" CHECK ("valueMinor" > 0 AND "valuePrecision" BETWEEN 0 AND 6 AND "position" > 0),
  CONSTRAINT "BatchOffer_dates_check" CHECK ("startDate" IS NULL OR "endDate" IS NULL OR "endDate" >= "startDate")
);

CREATE TABLE "BatchLifecycleEvent" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "batchId" UUID NOT NULL,
  "fromStatus" "BatchStatus",
  "toStatus" "BatchStatus" NOT NULL,
  "reason" TEXT,
  "actorId" UUID NOT NULL,
  "resultingVersion" INTEGER NOT NULL,
  "occurredAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BatchLifecycleEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BatchLifecycleEvent_version_check" CHECK ("resultingVersion" > 0)
);

CREATE UNIQUE INDEX "ProgramBatch_programId_code_key" ON "ProgramBatch"("programId", "code");
CREATE UNIQUE INDEX "ProgramBatch_currentFinancialRevisionId_key" ON "ProgramBatch"("currentFinancialRevisionId");
CREATE INDEX "ProgramBatch_programId_status_updatedAt_idx" ON "ProgramBatch"("programId", "status", "updatedAt");
CREATE INDEX "ProgramBatch_academicYearId_status_idx" ON "ProgramBatch"("academicYearId", "status");
CREATE INDEX "ProgramBatch_intakeId_status_idx" ON "ProgramBatch"("intakeId", "status");
CREATE INDEX "ProgramBatch_normalizedNameAr_idx" ON "ProgramBatch"("normalizedNameAr");
CREATE INDEX "ProgramBatch_normalizedNameEn_idx" ON "ProgramBatch"("normalizedNameEn");
CREATE INDEX "ProgramBatch_updatedAt_idx" ON "ProgramBatch"("updatedAt");
CREATE INDEX "BatchBranchAssignment_branchId_role_batchId_idx" ON "BatchBranchAssignment"("branchId", "role", "batchId");
CREATE INDEX "BatchBranchAssignment_batchId_role_idx" ON "BatchBranchAssignment"("batchId", "role");
CREATE UNIQUE INDEX "BatchFinancialRevision_batchId_revisionNumber_key" ON "BatchFinancialRevision"("batchId", "revisionNumber");
CREATE UNIQUE INDEX "BatchFinancialRevision_batchId_sourceBatchVersion_key" ON "BatchFinancialRevision"("batchId", "sourceBatchVersion");
CREATE INDEX "BatchFinancialRevision_batchId_createdAt_idx" ON "BatchFinancialRevision"("batchId", "createdAt");
CREATE UNIQUE INDEX "BatchInstallmentPlan_financialRevisionId_position_key" ON "BatchInstallmentPlan"("financialRevisionId", "position");
CREATE UNIQUE INDEX "BatchInstallmentPlan_financialRevisionId_externalId_key" ON "BatchInstallmentPlan"("financialRevisionId", "externalId");
CREATE INDEX "BatchInstallmentPlan_financialRevisionId_status_idx" ON "BatchInstallmentPlan"("financialRevisionId", "status");
CREATE UNIQUE INDEX "BatchInstallment_installmentPlanId_position_key" ON "BatchInstallment"("installmentPlanId", "position");
CREATE UNIQUE INDEX "BatchInstallment_installmentPlanId_externalId_key" ON "BatchInstallment"("installmentPlanId", "externalId");
CREATE UNIQUE INDEX "BatchOffer_financialRevisionId_position_key" ON "BatchOffer"("financialRevisionId", "position");
CREATE UNIQUE INDEX "BatchOffer_financialRevisionId_externalId_key" ON "BatchOffer"("financialRevisionId", "externalId");
CREATE INDEX "BatchOffer_financialRevisionId_kind_status_idx" ON "BatchOffer"("financialRevisionId", "kind", "status");
CREATE UNIQUE INDEX "BatchLifecycleEvent_batchId_resultingVersion_key" ON "BatchLifecycleEvent"("batchId", "resultingVersion");
CREATE INDEX "BatchLifecycleEvent_batchId_occurredAt_id_idx" ON "BatchLifecycleEvent"("batchId", "occurredAt", "id");

ALTER TABLE "ProgramBatch" ADD CONSTRAINT "ProgramBatch_programId_fkey" FOREIGN KEY ("programId") REFERENCES "AcademicProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProgramBatch" ADD CONSTRAINT "ProgramBatch_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProgramBatch" ADD CONSTRAINT "ProgramBatch_intakeId_fkey" FOREIGN KEY ("intakeId") REFERENCES "LookupValue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BatchBranchAssignment" ADD CONSTRAINT "BatchBranchAssignment_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ProgramBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BatchBranchAssignment" ADD CONSTRAINT "BatchBranchAssignment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BatchFinancialRevision" ADD CONSTRAINT "BatchFinancialRevision_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ProgramBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BatchInstallmentPlan" ADD CONSTRAINT "BatchInstallmentPlan_financialRevisionId_fkey" FOREIGN KEY ("financialRevisionId") REFERENCES "BatchFinancialRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BatchInstallment" ADD CONSTRAINT "BatchInstallment_installmentPlanId_fkey" FOREIGN KEY ("installmentPlanId") REFERENCES "BatchInstallmentPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BatchOffer" ADD CONSTRAINT "BatchOffer_financialRevisionId_fkey" FOREIGN KEY ("financialRevisionId") REFERENCES "BatchFinancialRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BatchLifecycleEvent" ADD CONSTRAINT "BatchLifecycleEvent_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ProgramBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProgramBatch" ADD CONSTRAINT "ProgramBatch_currentFinancialRevisionId_fkey" FOREIGN KEY ("currentFinancialRevisionId") REFERENCES "BatchFinancialRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION reject_batch_history_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'Program Batch financial and lifecycle history is append-only' USING ERRCODE = '23000';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "BatchFinancialRevision_append_only" BEFORE UPDATE OR DELETE ON "BatchFinancialRevision" FOR EACH ROW EXECUTE FUNCTION reject_batch_history_mutation();
CREATE TRIGGER "BatchInstallmentPlan_append_only" BEFORE UPDATE OR DELETE ON "BatchInstallmentPlan" FOR EACH ROW EXECUTE FUNCTION reject_batch_history_mutation();
CREATE TRIGGER "BatchInstallment_append_only" BEFORE UPDATE OR DELETE ON "BatchInstallment" FOR EACH ROW EXECUTE FUNCTION reject_batch_history_mutation();
CREATE TRIGGER "BatchOffer_append_only" BEFORE UPDATE OR DELETE ON "BatchOffer" FOR EACH ROW EXECUTE FUNCTION reject_batch_history_mutation();
CREATE TRIGGER "BatchLifecycleEvent_append_only" BEFORE UPDATE OR DELETE ON "BatchLifecycleEvent" FOR EACH ROW EXECUTE FUNCTION reject_batch_history_mutation();
