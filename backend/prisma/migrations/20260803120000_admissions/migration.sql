-- CreateEnum
CREATE TYPE "ApplicantStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AdmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'ENROLLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AdmissionOfferingKind" AS ENUM ('PROFESSIONAL_PROGRAM', 'PROFESSIONAL_DIPLOMA', 'TRAINING_COURSE');

-- CreateEnum
CREATE TYPE "EligibilityContext" AS ENUM ('SELECTION', 'SUBMISSION', 'APPROVAL');

-- CreateEnum
CREATE TYPE "FinancialSourceKind" AS ENUM ('CATALOG_OFFERING', 'PROGRAM_BATCH');

-- CreateEnum
CREATE TYPE "DiscountMode" AS ENUM ('NONE', 'PERCENTAGE', 'AMOUNT');

-- CreateEnum
CREATE TYPE "AdmissionDocumentVersionStatus" AS ENUM ('AVAILABLE', 'FAILED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "AdmissionDocumentDecisionKind" AS ENUM ('VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AdmissionTimelineEventKind" AS ENUM ('CREATED', 'APPLICANT_UPDATED', 'NOTES_UPDATED', 'ASSIGNMENT_CHANGED', 'SELECTION_CHANGED', 'FINANCIAL_UPDATED', 'DOCUMENT_UPLOADED', 'DOCUMENT_REPLACED', 'DOCUMENT_WITHDRAWN', 'DOCUMENT_VERIFIED', 'DOCUMENT_REJECTED', 'POLICY_REFRESHED', 'STATUS_CHANGED', 'APPROVED', 'REJECTED', 'ARCHIVED', 'ENROLLED');

-- CreateEnum
CREATE TYPE "AdmissionRequestStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "Applicant" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "normalizedFullName" TEXT NOT NULL,
    "primaryPhone" TEXT NOT NULL,
    "normalizedPrimaryPhone" TEXT NOT NULL,
    "guardianPhone" TEXT,
    "normalizedGuardianPhone" TEXT,
    "nationalId" TEXT,
    "normalizedNationalId" TEXT,
    "alternativeIdentityReason" TEXT,
    "address" TEXT NOT NULL,
    "dateOfBirth" DATE NOT NULL,
    "qualificationId" UUID NOT NULL,
    "qualificationLabel" TEXT NOT NULL,
    "graduationYear" INTEGER NOT NULL,
    "privateNotes" TEXT,
    "profileFile" JSONB,
    "status" "ApplicantStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "archiveReason" TEXT,
    "archivedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,

    CONSTRAINT "Applicant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admission" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "applicantId" UUID NOT NULL,
    "status" "AdmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "registrationBranchId" UUID NOT NULL,
    "registrationBranchLabel" TEXT NOT NULL,
    "studyBranchId" UUID NOT NULL,
    "studyBranchLabel" TEXT NOT NULL,
    "admissionsEmployeeId" UUID NOT NULL,
    "admissionsEmployeeLabel" TEXT NOT NULL,
    "customerServiceEmployeeId" UUID NOT NULL,
    "customerServiceEmployeeLabel" TEXT NOT NULL,
    "customerServiceManagerId" UUID NOT NULL,
    "customerServiceManagerLabel" TEXT NOT NULL,
    "departmentId" UUID NOT NULL,
    "departmentLabel" TEXT NOT NULL,
    "leadSourceId" UUID NOT NULL,
    "leadSourceLabel" TEXT NOT NULL,
    "academicGradeId" UUID,
    "academicGradeLabel" TEXT,
    "currentSelectionRevisionId" UUID,
    "currentFinancialRevisionId" UUID,
    "currentDocumentPolicySnapshotId" UUID,
    "approvalSnapshotId" UUID,
    "privateNotes" TEXT,
    "activeReviewerId" UUID,
    "activeReviewerName" TEXT,
    "reviewStartedAt" TIMESTAMPTZ,
    "externalEnrollmentReference" TEXT,
    "archiveReason" TEXT,
    "archivedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,

    CONSTRAINT "Admission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdmissionSelectionRevision" (
    "id" UUID NOT NULL,
    "admissionId" UUID NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "sourceAdmissionVersion" INTEGER NOT NULL,
    "resultAdmissionVersion" INTEGER NOT NULL,
    "offeringKind" "AdmissionOfferingKind" NOT NULL,
    "offeringId" UUID NOT NULL,
    "offeringVersion" INTEGER NOT NULL,
    "offeringLabel" TEXT NOT NULL,
    "offeringCode" TEXT NOT NULL,
    "batchId" UUID,
    "batchVersion" INTEGER,
    "batchLabel" TEXT,
    "batchCode" TEXT,
    "batchFinancialRevisionId" UUID,
    "registrationBranch" JSONB NOT NULL,
    "studyBranch" JSONB NOT NULL,
    "changeReason" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID NOT NULL,

    CONSTRAINT "AdmissionSelectionRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdmissionEligibilityAssessment" (
    "id" UUID NOT NULL,
    "admissionId" UUID NOT NULL,
    "selectionRevisionId" UUID NOT NULL,
    "context" "EligibilityContext" NOT NULL,
    "eligible" BOOLEAN NOT NULL,
    "evaluatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "offeringVersion" INTEGER NOT NULL,
    "batchVersion" INTEGER,
    "availableSeats" INTEGER,
    "reasonCodes" TEXT[],

    CONSTRAINT "AdmissionEligibilityAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdmissionFinancialRevision" (
    "id" UUID NOT NULL,
    "admissionId" UUID NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "sourceKind" "FinancialSourceKind" NOT NULL,
    "sourceId" UUID NOT NULL,
    "sourceVersion" INTEGER NOT NULL,
    "sourceFinancialRevisionId" UUID,
    "productPriceMinor" BIGINT NOT NULL,
    "registrationFeesMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL,
    "precision" INTEGER NOT NULL,
    "discountMode" "DiscountMode" NOT NULL,
    "discountPercentageScaled" INTEGER NOT NULL,
    "discountAmountMinor" BIGINT NOT NULL,
    "requiredAmountMinor" BIGINT NOT NULL,
    "reason" TEXT,
    "resultAdmissionVersion" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID NOT NULL,

    CONSTRAINT "AdmissionFinancialRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdmissionDocumentPolicySnapshot" (
    "id" UUID NOT NULL,
    "admissionId" UUID NOT NULL,
    "sourcePolicyId" UUID NOT NULL,
    "sourcePolicyVersion" INTEGER NOT NULL,
    "snapshotVersion" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" UUID NOT NULL,

    CONSTRAINT "AdmissionDocumentPolicySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdmissionDocumentPolicyRequirement" (
    "id" UUID NOT NULL,
    "snapshotId" UUID NOT NULL,
    "stableKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL,
    "requiredAtStage" "AdmissionStatus" NOT NULL,
    "allowedMimeTypes" TEXT[],
    "maximumBytes" INTEGER NOT NULL,
    "sourceRequirementId" UUID NOT NULL,

    CONSTRAINT "AdmissionDocumentPolicyRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdmissionDocument" (
    "id" UUID NOT NULL,
    "admissionId" UUID NOT NULL,
    "requirementKey" TEXT NOT NULL,
    "currentRequirementId" UUID NOT NULL,
    "currentVersionId" UUID,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "createdBy" UUID NOT NULL,
    "updatedBy" UUID NOT NULL,

    CONSTRAINT "AdmissionDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdmissionDocumentVersion" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "storageFileId" TEXT NOT NULL,
    "fileDescriptor" JSONB NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "previewLocator" TEXT,
    "status" "AdmissionDocumentVersionStatus" NOT NULL DEFAULT 'AVAILABLE',
    "idempotencyKey" TEXT NOT NULL,
    "uploadedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" UUID NOT NULL,
    "withdrawnAt" TIMESTAMPTZ,
    "withdrawnBy" UUID,
    "withdrawalReason" TEXT,

    CONSTRAINT "AdmissionDocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdmissionDocumentDecision" (
    "id" UUID NOT NULL,
    "documentVersionId" UUID NOT NULL,
    "decision" "AdmissionDocumentDecisionKind" NOT NULL,
    "reason" TEXT,
    "reviewerId" UUID NOT NULL,
    "reviewerName" TEXT NOT NULL,
    "decidedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceAdmissionVersion" INTEGER NOT NULL,

    CONSTRAINT "AdmissionDocumentDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdmissionApprovalSnapshot" (
    "id" UUID NOT NULL,
    "admissionId" UUID NOT NULL,
    "sourceAdmissionVersion" INTEGER NOT NULL,
    "selectionRevisionId" UUID NOT NULL,
    "financialRevisionId" UUID NOT NULL,
    "documentPolicySnapshotId" UUID NOT NULL,
    "assignmentSnapshot" JSONB NOT NULL,
    "applicantSnapshot" JSONB NOT NULL,
    "verifiedDocumentVersionIds" TEXT[],
    "academicTarget" JSONB NOT NULL,
    "requiredAmountMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "approvedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedBy" UUID NOT NULL,

    CONSTRAINT "AdmissionApprovalSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdmissionLifecycleEvent" (
    "id" UUID NOT NULL,
    "admissionId" UUID NOT NULL,
    "fromStatus" "AdmissionStatus",
    "toStatus" "AdmissionStatus" NOT NULL,
    "reason" TEXT,
    "actorId" UUID NOT NULL,
    "actorName" TEXT NOT NULL,
    "sourceVersion" INTEGER NOT NULL,
    "resultVersion" INTEGER NOT NULL,
    "occurredAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdmissionLifecycleEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdmissionTimelineEvent" (
    "id" UUID NOT NULL,
    "admissionId" UUID NOT NULL,
    "kind" "AdmissionTimelineEventKind" NOT NULL,
    "sourceAdmissionVersion" INTEGER NOT NULL,
    "resultAdmissionVersion" INTEGER NOT NULL,
    "actorId" UUID NOT NULL,
    "actorName" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "occurredAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdmissionTimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdmissionRequestKey" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "operationScope" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestFingerprint" TEXT NOT NULL,
    "targetId" UUID,
    "resultPayload" JSONB,
    "status" "AdmissionRequestStatus" NOT NULL DEFAULT 'PROCESSING',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "AdmissionRequestKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdmissionReferenceCounter" (
    "organizationId" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "nextValue" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "AdmissionReferenceCounter_pkey" PRIMARY KEY ("organizationId","year")
);

-- CreateIndex
CREATE INDEX "Applicant_organizationId_normalizedNationalId_idx" ON "Applicant"("organizationId", "normalizedNationalId");

-- CreateIndex
CREATE INDEX "Applicant_organizationId_normalizedPrimaryPhone_idx" ON "Applicant"("organizationId", "normalizedPrimaryPhone");

-- CreateIndex
CREATE INDEX "Applicant_organizationId_normalizedFullName_idx" ON "Applicant"("organizationId", "normalizedFullName");

-- CreateIndex
CREATE INDEX "Applicant_organizationId_status_idx" ON "Applicant"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Admission_currentSelectionRevisionId_key" ON "Admission"("currentSelectionRevisionId");

-- CreateIndex
CREATE UNIQUE INDEX "Admission_currentFinancialRevisionId_key" ON "Admission"("currentFinancialRevisionId");

-- CreateIndex
CREATE UNIQUE INDEX "Admission_currentDocumentPolicySnapshotId_key" ON "Admission"("currentDocumentPolicySnapshotId");

-- CreateIndex
CREATE UNIQUE INDEX "Admission_approvalSnapshotId_key" ON "Admission"("approvalSnapshotId");

-- CreateIndex
CREATE INDEX "Admission_organizationId_status_updatedAt_id_idx" ON "Admission"("organizationId", "status", "updatedAt", "id");

-- CreateIndex
CREATE INDEX "Admission_applicantId_idx" ON "Admission"("applicantId");

-- CreateIndex
CREATE INDEX "Admission_registrationBranchId_status_idx" ON "Admission"("registrationBranchId", "status");

-- CreateIndex
CREATE INDEX "Admission_studyBranchId_status_idx" ON "Admission"("studyBranchId", "status");

-- CreateIndex
CREATE INDEX "Admission_admissionsEmployeeId_status_idx" ON "Admission"("admissionsEmployeeId", "status");

-- CreateIndex
CREATE INDEX "Admission_customerServiceEmployeeId_status_idx" ON "Admission"("customerServiceEmployeeId", "status");

-- CreateIndex
CREATE INDEX "Admission_customerServiceManagerId_status_idx" ON "Admission"("customerServiceManagerId", "status");

-- CreateIndex
CREATE INDEX "Admission_createdAt_idx" ON "Admission"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Admission_organizationId_reference_key" ON "Admission"("organizationId", "reference");

-- CreateIndex
CREATE INDEX "AdmissionSelectionRevision_offeringId_offeringKind_idx" ON "AdmissionSelectionRevision"("offeringId", "offeringKind");

-- CreateIndex
CREATE INDEX "AdmissionSelectionRevision_batchId_idx" ON "AdmissionSelectionRevision"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionSelectionRevision_admissionId_revisionNumber_key" ON "AdmissionSelectionRevision"("admissionId", "revisionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionSelectionRevision_admissionId_resultAdmissionVersi_key" ON "AdmissionSelectionRevision"("admissionId", "resultAdmissionVersion");

-- CreateIndex
CREATE INDEX "AdmissionEligibilityAssessment_admissionId_context_evaluate_idx" ON "AdmissionEligibilityAssessment"("admissionId", "context", "evaluatedAt");

-- CreateIndex
CREATE INDEX "AdmissionEligibilityAssessment_selectionRevisionId_idx" ON "AdmissionEligibilityAssessment"("selectionRevisionId");

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionFinancialRevision_admissionId_revisionNumber_key" ON "AdmissionFinancialRevision"("admissionId", "revisionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionFinancialRevision_admissionId_resultAdmissionVersi_key" ON "AdmissionFinancialRevision"("admissionId", "resultAdmissionVersion");

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionDocumentPolicySnapshot_admissionId_snapshotVersion_key" ON "AdmissionDocumentPolicySnapshot"("admissionId", "snapshotVersion");

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionDocumentPolicyRequirement_snapshotId_stableKey_key" ON "AdmissionDocumentPolicyRequirement"("snapshotId", "stableKey");

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionDocument_currentVersionId_key" ON "AdmissionDocument"("currentVersionId");

-- CreateIndex
CREATE INDEX "AdmissionDocument_currentRequirementId_idx" ON "AdmissionDocument"("currentRequirementId");

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionDocument_admissionId_requirementKey_key" ON "AdmissionDocument"("admissionId", "requirementKey");

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionDocumentVersion_documentId_versionNumber_key" ON "AdmissionDocumentVersion"("documentId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionDocumentVersion_documentId_idempotencyKey_key" ON "AdmissionDocumentVersion"("documentId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "AdmissionDocumentDecision_documentVersionId_decidedAt_idx" ON "AdmissionDocumentDecision"("documentVersionId", "decidedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionApprovalSnapshot_admissionId_key" ON "AdmissionApprovalSnapshot"("admissionId");

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionApprovalSnapshot_idempotencyKey_key" ON "AdmissionApprovalSnapshot"("idempotencyKey");

-- CreateIndex
CREATE INDEX "AdmissionLifecycleEvent_admissionId_occurredAt_id_idx" ON "AdmissionLifecycleEvent"("admissionId", "occurredAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionLifecycleEvent_admissionId_resultVersion_key" ON "AdmissionLifecycleEvent"("admissionId", "resultVersion");

-- CreateIndex
CREATE INDEX "AdmissionTimelineEvent_admissionId_occurredAt_id_idx" ON "AdmissionTimelineEvent"("admissionId", "occurredAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionRequestKey_organizationId_operationScope_idempoten_key" ON "AdmissionRequestKey"("organizationId", "operationScope", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_currentSelectionRevisionId_fkey" FOREIGN KEY ("currentSelectionRevisionId") REFERENCES "AdmissionSelectionRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_currentFinancialRevisionId_fkey" FOREIGN KEY ("currentFinancialRevisionId") REFERENCES "AdmissionFinancialRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_currentDocumentPolicySnapshotId_fkey" FOREIGN KEY ("currentDocumentPolicySnapshotId") REFERENCES "AdmissionDocumentPolicySnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_approvalSnapshotId_fkey" FOREIGN KEY ("approvalSnapshotId") REFERENCES "AdmissionApprovalSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionSelectionRevision" ADD CONSTRAINT "AdmissionSelectionRevision_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionEligibilityAssessment" ADD CONSTRAINT "AdmissionEligibilityAssessment_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionFinancialRevision" ADD CONSTRAINT "AdmissionFinancialRevision_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionDocumentPolicySnapshot" ADD CONSTRAINT "AdmissionDocumentPolicySnapshot_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionDocumentPolicyRequirement" ADD CONSTRAINT "AdmissionDocumentPolicyRequirement_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "AdmissionDocumentPolicySnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionDocument" ADD CONSTRAINT "AdmissionDocument_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionDocument" ADD CONSTRAINT "AdmissionDocument_currentRequirementId_fkey" FOREIGN KEY ("currentRequirementId") REFERENCES "AdmissionDocumentPolicyRequirement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionDocument" ADD CONSTRAINT "AdmissionDocument_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "AdmissionDocumentVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionDocumentVersion" ADD CONSTRAINT "AdmissionDocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "AdmissionDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionDocumentDecision" ADD CONSTRAINT "AdmissionDocumentDecision_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "AdmissionDocumentVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionApprovalSnapshot" ADD CONSTRAINT "AdmissionApprovalSnapshot_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionLifecycleEvent" ADD CONSTRAINT "AdmissionLifecycleEvent_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionTimelineEvent" ADD CONSTRAINT "AdmissionTimelineEvent_admissionId_fkey" FOREIGN KEY ("admissionId") REFERENCES "Admission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Domain constraints not expressible in Prisma.
ALTER TABLE "Applicant" ADD CONSTRAINT "Applicant_version_positive" CHECK ("version" > 0);
ALTER TABLE "Applicant" ADD CONSTRAINT "Applicant_archive_complete" CHECK (("status" <> 'ARCHIVED') OR ("archiveReason" IS NOT NULL AND length(btrim("archiveReason")) > 0 AND "archivedAt" IS NOT NULL));
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_version_positive" CHECK ("version" > 0);
ALTER TABLE "Admission" ADD CONSTRAINT "Admission_archive_complete" CHECK (("status" <> 'ARCHIVED') OR ("archiveReason" IS NOT NULL AND length(btrim("archiveReason")) > 0 AND "archivedAt" IS NOT NULL));
ALTER TABLE "AdmissionSelectionRevision" ADD CONSTRAINT "AdmissionSelectionRevision_positive" CHECK ("revisionNumber" > 0 AND "sourceAdmissionVersion" > 0 AND "resultAdmissionVersion" > 0);
ALTER TABLE "AdmissionSelectionRevision" ADD CONSTRAINT "AdmissionSelectionRevision_batch_by_kind" CHECK (("offeringKind" = 'PROFESSIONAL_PROGRAM' AND "batchId" IS NOT NULL) OR ("offeringKind" <> 'PROFESSIONAL_PROGRAM' AND "batchId" IS NULL));
ALTER TABLE "AdmissionFinancialRevision" ADD CONSTRAINT "AdmissionFinancialRevision_amounts" CHECK ("revisionNumber" > 0 AND "precision" BETWEEN 0 AND 6 AND "productPriceMinor" >= 0 AND "registrationFeesMinor" >= 0 AND "discountAmountMinor" >= 0 AND "requiredAmountMinor" >= 0 AND "discountPercentageScaled" BETWEEN 0 AND 10000 AND "requiredAmountMinor" = GREATEST(0, "productPriceMinor" + "registrationFeesMinor" - "discountAmountMinor"));
ALTER TABLE "AdmissionDocumentPolicyRequirement" ADD CONSTRAINT "AdmissionDocumentPolicyRequirement_maximumBytes" CHECK ("maximumBytes" > 0 AND "maximumBytes" <= 5000000);
ALTER TABLE "AdmissionDocumentVersion" ADD CONSTRAINT "AdmissionDocumentVersion_file" CHECK ("versionNumber" > 0 AND "byteSize" > 0 AND "byteSize" <= 5000000 AND "mimeType" IN ('application/pdf', 'image/jpeg', 'image/png'));
ALTER TABLE "AdmissionDocumentDecision" ADD CONSTRAINT "AdmissionDocumentDecision_rejection_reason" CHECK ("decision" <> 'REJECTED' OR ("reason" IS NOT NULL AND length(btrim("reason")) > 0));
ALTER TABLE "AdmissionReferenceCounter" ADD CONSTRAINT "AdmissionReferenceCounter_positive" CHECK ("year" >= 2000 AND "nextValue" > 0);

-- Deferrable ownership checks guarantee every current pointer belongs to its root.
CREATE FUNCTION admission_assert_current_pointer_ownership() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."currentSelectionRevisionId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "AdmissionSelectionRevision" r WHERE r.id = NEW."currentSelectionRevisionId" AND r."admissionId" = NEW.id) THEN RAISE EXCEPTION 'current selection revision does not belong to admission'; END IF;
  IF NEW."currentFinancialRevisionId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "AdmissionFinancialRevision" r WHERE r.id = NEW."currentFinancialRevisionId" AND r."admissionId" = NEW.id) THEN RAISE EXCEPTION 'current financial revision does not belong to admission'; END IF;
  IF NEW."currentDocumentPolicySnapshotId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "AdmissionDocumentPolicySnapshot" r WHERE r.id = NEW."currentDocumentPolicySnapshotId" AND r."admissionId" = NEW.id) THEN RAISE EXCEPTION 'current document policy does not belong to admission'; END IF;
  IF NEW."approvalSnapshotId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "AdmissionApprovalSnapshot" r WHERE r.id = NEW."approvalSnapshotId" AND r."admissionId" = NEW.id) THEN RAISE EXCEPTION 'approval snapshot does not belong to admission'; END IF;
  RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER "Admission_current_pointer_ownership" AFTER INSERT OR UPDATE ON "Admission" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION admission_assert_current_pointer_ownership();

CREATE FUNCTION admission_assert_document_pointer_ownership() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."currentVersionId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "AdmissionDocumentVersion" v WHERE v.id = NEW."currentVersionId" AND v."documentId" = NEW.id) THEN RAISE EXCEPTION 'current document version does not belong to document'; END IF;
  RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER "AdmissionDocument_current_pointer_ownership" AFTER INSERT OR UPDATE ON "AdmissionDocument" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION admission_assert_document_pointer_ownership();

-- Immutable evidence/history rows may only be appended.
CREATE FUNCTION admissions_reject_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION '% is append-only', TG_TABLE_NAME; END $$;
CREATE TRIGGER "AdmissionSelectionRevision_append_only" BEFORE UPDATE OR DELETE ON "AdmissionSelectionRevision" FOR EACH ROW EXECUTE FUNCTION admissions_reject_history_mutation();
CREATE TRIGGER "AdmissionEligibilityAssessment_append_only" BEFORE UPDATE OR DELETE ON "AdmissionEligibilityAssessment" FOR EACH ROW EXECUTE FUNCTION admissions_reject_history_mutation();
CREATE TRIGGER "AdmissionFinancialRevision_append_only" BEFORE UPDATE OR DELETE ON "AdmissionFinancialRevision" FOR EACH ROW EXECUTE FUNCTION admissions_reject_history_mutation();
CREATE TRIGGER "AdmissionDocumentPolicySnapshot_append_only" BEFORE UPDATE OR DELETE ON "AdmissionDocumentPolicySnapshot" FOR EACH ROW EXECUTE FUNCTION admissions_reject_history_mutation();
CREATE TRIGGER "AdmissionDocumentPolicyRequirement_append_only" BEFORE UPDATE OR DELETE ON "AdmissionDocumentPolicyRequirement" FOR EACH ROW EXECUTE FUNCTION admissions_reject_history_mutation();
CREATE TRIGGER "AdmissionDocumentDecision_append_only" BEFORE UPDATE OR DELETE ON "AdmissionDocumentDecision" FOR EACH ROW EXECUTE FUNCTION admissions_reject_history_mutation();
CREATE TRIGGER "AdmissionApprovalSnapshot_append_only" BEFORE UPDATE OR DELETE ON "AdmissionApprovalSnapshot" FOR EACH ROW EXECUTE FUNCTION admissions_reject_history_mutation();
CREATE TRIGGER "AdmissionLifecycleEvent_append_only" BEFORE UPDATE OR DELETE ON "AdmissionLifecycleEvent" FOR EACH ROW EXECUTE FUNCTION admissions_reject_history_mutation();
CREATE TRIGGER "AdmissionTimelineEvent_append_only" BEFORE UPDATE OR DELETE ON "AdmissionTimelineEvent" FOR EACH ROW EXECUTE FUNCTION admissions_reject_history_mutation();
