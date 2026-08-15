-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'GRADUATED', 'WITHDRAWN', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "StudentEnrollmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'SUSPENDED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "StudentOfferingKind" AS ENUM ('PROFESSIONAL_PROGRAM', 'PROFESSIONAL_DIPLOMA', 'TRAINING_COURSE');

-- CreateEnum
CREATE TYPE "StudentDocumentState" AS ENUM ('MISSING', 'PRESENT', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "StudentTimelineCategory" AS ENUM ('ADMISSION_SUBMITTED', 'ADMISSION_APPROVED', 'STUDENT_CREATED', 'ENROLLMENT_ADDED', 'DOCUMENT_UPLOADED', 'DOCUMENT_REPLACED', 'DOCUMENT_ARCHIVED', 'PROFILE_UPDATED', 'STATUS_CHANGED', 'FINANCIAL_EVENT', 'ACADEMIC_EVENT');

-- DropForeignKey
ALTER TABLE "AcademicProduct" DROP CONSTRAINT "AcademicProduct_productTypeId_fkey";

-- DropForeignKey
ALTER TABLE "ProductAsset" DROP CONSTRAINT "ProductAsset_productId_fkey";

-- DropForeignKey
ALTER TABLE "ProductBranchAssignment" DROP CONSTRAINT "ProductBranchAssignment_productId_fkey";

-- DropForeignKey
ALTER TABLE "ProductContentItem" DROP CONSTRAINT "ProductContentItem_productId_fkey";

-- DropForeignKey
ALTER TABLE "ProductLifecycleEvent" DROP CONSTRAINT "ProductLifecycleEvent_productId_fkey";

-- DropForeignKey
ALTER TABLE "ProductPricing" DROP CONSTRAINT "ProductPricing_productId_fkey";

-- DropForeignKey
ALTER TABLE "ProductTypeField" DROP CONSTRAINT "ProductTypeField_productTypeId_fkey";

-- AlterTable
ALTER TABLE "BatchFinancialRevision" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "BatchLifecycleEvent" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ProgramBatch" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "Student" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "studentCode" TEXT NOT NULL,
    "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE',
    "fullName" TEXT NOT NULL,
    "searchName" TEXT NOT NULL,
    "primaryPhone" TEXT NOT NULL,
    "guardianName" TEXT,
    "guardianPhone" TEXT,
    "nationalId" TEXT,
    "normalizedNationalId" TEXT,
    "alternativeIdentityReason" TEXT,
    "address" TEXT NOT NULL,
    "dateOfBirth" DATE NOT NULL,
    "qualificationId" UUID NOT NULL,
    "qualificationLabel" TEXT NOT NULL,
    "graduationYear" INTEGER NOT NULL,
    "profileImageFileId" TEXT,
    "profileImageUrl" TEXT,
    "registrationBranchId" UUID NOT NULL,
    "registrationBranchLabel" TEXT NOT NULL,
    "studyBranchId" UUID NOT NULL,
    "studyBranchLabel" TEXT NOT NULL,
    "departmentId" UUID NOT NULL,
    "departmentLabel" TEXT NOT NULL,
    "academicGradeId" UUID,
    "academicGradeLabel" TEXT,
    "customerServiceEmployeeId" UUID NOT NULL,
    "customerServiceEmployeeName" TEXT NOT NULL,
    "admissionId" UUID NOT NULL,
    "admissionReference" TEXT NOT NULL,
    "approvalSnapshotId" UUID NOT NULL,
    "admissionDate" DATE NOT NULL,
    "enrollmentDate" DATE NOT NULL,
    "archivedAt" TIMESTAMPTZ,
    "archiveReason" TEXT,
    "timelineSequence" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID NOT NULL,
    "createdByName" TEXT NOT NULL,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "updatedById" UUID NOT NULL,
    "updatedByName" TEXT NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentEnrollment" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "offeringKind" "StudentOfferingKind" NOT NULL,
    "offeringId" UUID NOT NULL,
    "offeringVersionAtEnrollment" INTEGER NOT NULL,
    "offeringLabel" TEXT NOT NULL,
    "offeringCode" TEXT NOT NULL,
    "batchId" UUID,
    "batchVersionAtEnrollment" INTEGER,
    "batchLabel" TEXT,
    "batchCode" TEXT,
    "registrationBranchLabel" TEXT NOT NULL,
    "studyBranchLabel" TEXT NOT NULL,
    "academicYear" INTEGER NOT NULL,
    "enrollmentDate" DATE NOT NULL,
    "status" "StudentEnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "sourceAdmissionId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentDocument" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "typeKey" TEXT NOT NULL,
    "state" "StudentDocumentState" NOT NULL DEFAULT 'PRESENT',
    "currentVersionId" UUID,
    "archivedAt" TIMESTAMPTZ,
    "archiveReason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID NOT NULL,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "updatedById" UUID NOT NULL,

    CONSTRAINT "StudentDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentDocumentVersion" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "storageFileId" TEXT NOT NULL,
    "fileDescriptor" JSONB NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "previewLocator" TEXT,
    "uploadAttemptId" TEXT NOT NULL,
    "uploadedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedById" UUID NOT NULL,
    "uploadedByName" TEXT NOT NULL,
    "copiedFromAdmissionVersionId" UUID,

    CONSTRAINT "StudentDocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentStatusChange" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "fromStatus" "StudentStatus",
    "toStatus" "StudentStatus" NOT NULL,
    "reason" TEXT,
    "actorId" UUID NOT NULL,
    "actorName" TEXT NOT NULL,
    "occurredAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceVersion" INTEGER NOT NULL,
    "resultVersion" INTEGER NOT NULL,

    CONSTRAINT "StudentStatusChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentNote" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" UUID NOT NULL,
    "authorName" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMPTZ,
    "editedById" UUID,
    "editedByName" TEXT,
    "archivedAt" TIMESTAMPTZ,

    CONSTRAINT "StudentNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentTimelineEvent" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "category" "StudentTimelineCategory" NOT NULL,
    "occurredAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sequence" INTEGER NOT NULL,
    "actorId" UUID NOT NULL,
    "actorName" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "subjectRef" TEXT,
    "summary" TEXT NOT NULL,

    CONSTRAINT "StudentTimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentIntakeKey" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "approvalSnapshotId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentIntakeKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentCodeCounter" (
    "organizationId" UUID NOT NULL,
    "academicYear" INTEGER NOT NULL,
    "branchId" UUID NOT NULL,
    "nextValue" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "StudentCodeCounter_pkey" PRIMARY KEY ("organizationId","academicYear","branchId")
);

-- CreateIndex
CREATE INDEX "Student_organizationId_status_idx" ON "Student"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Student_organizationId_registrationBranchId_idx" ON "Student"("organizationId", "registrationBranchId");

-- CreateIndex
CREATE INDEX "Student_organizationId_studyBranchId_idx" ON "Student"("organizationId", "studyBranchId");

-- CreateIndex
CREATE INDEX "Student_organizationId_departmentId_idx" ON "Student"("organizationId", "departmentId");

-- CreateIndex
CREATE INDEX "Student_organizationId_customerServiceEmployeeId_idx" ON "Student"("organizationId", "customerServiceEmployeeId");

-- CreateIndex
CREATE INDEX "Student_organizationId_updatedAt_idx" ON "Student"("organizationId", "updatedAt");

-- CreateIndex
CREATE INDEX "Student_searchName_idx" ON "Student"("searchName");

-- CreateIndex
CREATE UNIQUE INDEX "Student_organizationId_studentCode_key" ON "Student"("organizationId", "studentCode");

-- CreateIndex
CREATE UNIQUE INDEX "Student_organizationId_normalizedNationalId_key" ON "Student"("organizationId", "normalizedNationalId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_organizationId_approvalSnapshotId_key" ON "Student"("organizationId", "approvalSnapshotId");

-- CreateIndex
CREATE INDEX "StudentEnrollment_studentId_idx" ON "StudentEnrollment"("studentId");

-- CreateIndex
CREATE INDEX "StudentEnrollment_offeringId_idx" ON "StudentEnrollment"("offeringId");

-- CreateIndex
CREATE INDEX "StudentEnrollment_batchId_idx" ON "StudentEnrollment"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentDocument_currentVersionId_key" ON "StudentDocument"("currentVersionId");

-- CreateIndex
CREATE INDEX "StudentDocument_studentId_typeKey_idx" ON "StudentDocument"("studentId", "typeKey");

-- CreateIndex
CREATE UNIQUE INDEX "StudentDocumentVersion_documentId_versionNumber_key" ON "StudentDocumentVersion"("documentId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "StudentDocumentVersion_documentId_uploadAttemptId_key" ON "StudentDocumentVersion"("documentId", "uploadAttemptId");

-- CreateIndex
CREATE INDEX "StudentStatusChange_studentId_occurredAt_idx" ON "StudentStatusChange"("studentId", "occurredAt");

-- CreateIndex
CREATE INDEX "StudentNote_studentId_createdAt_idx" ON "StudentNote"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "StudentTimelineEvent_studentId_sequence_idx" ON "StudentTimelineEvent"("studentId", "sequence" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "StudentTimelineEvent_studentId_sequence_key" ON "StudentTimelineEvent"("studentId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "StudentIntakeKey_organizationId_approvalSnapshotId_key" ON "StudentIntakeKey"("organizationId", "approvalSnapshotId");

-- AddForeignKey
ALTER TABLE "ProductTypeField" ADD CONSTRAINT "ProductTypeField_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "ProductType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicProduct" ADD CONSTRAINT "AcademicProduct_productTypeId_fkey" FOREIGN KEY ("productTypeId") REFERENCES "ProductType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPricing" ADD CONSTRAINT "ProductPricing_productId_fkey" FOREIGN KEY ("productId") REFERENCES "AcademicProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductBranchAssignment" ADD CONSTRAINT "ProductBranchAssignment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "AcademicProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductContentItem" ADD CONSTRAINT "ProductContentItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "AcademicProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAsset" ADD CONSTRAINT "ProductAsset_productId_fkey" FOREIGN KEY ("productId") REFERENCES "AcademicProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductLifecycleEvent" ADD CONSTRAINT "ProductLifecycleEvent_productId_fkey" FOREIGN KEY ("productId") REFERENCES "AcademicProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentDocument" ADD CONSTRAINT "StudentDocument_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentDocument" ADD CONSTRAINT "StudentDocument_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "StudentDocumentVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentDocumentVersion" ADD CONSTRAINT "StudentDocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "StudentDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentStatusChange" ADD CONSTRAINT "StudentStatusChange_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentNote" ADD CONSTRAINT "StudentNote_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTimelineEvent" ADD CONSTRAINT "StudentTimelineEvent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Program-requires-batch rule (data-model.md, FR-006). Enforced in the service
-- for a friendly error, and here so no code path can persist a violating row.
ALTER TABLE "StudentEnrollment"
  ADD CONSTRAINT "StudentEnrollment_batch_rule"
  CHECK (
    ("offeringKind" = 'PROFESSIONAL_PROGRAM' AND "batchId" IS NOT NULL)
    OR ("offeringKind" <> 'PROFESSIONAL_PROGRAM' AND "batchId" IS NULL)
  );

-- One document row per type per student, EXCEPT additional-attachment which is
-- explicitly multiple (research.md R-009). A plain composite unique would
-- forbid the second attachment, so this is a partial index.
CREATE UNIQUE INDEX "StudentDocument_single_instance_type"
  ON "StudentDocument" ("studentId", "typeKey")
  WHERE "typeKey" <> 'additional-attachment';
