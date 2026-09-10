/*
  Warnings:

  - You are about to drop the column `branchIds` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `departmentId` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `branchId` on the `Contact` table. All the data in the column will be lost.
  - You are about to drop the column `defaultAcademicYearId` on the `GeneralSettings` table. All the data in the column will be lost.
  - You are about to drop the column `defaultBranchId` on the `GeneralSettings` table. All the data in the column will be lost.
  - You are about to drop the column `branchId` on the `InboxChannelConnection` table. All the data in the column will be lost.
  - You are about to drop the column `branchId` on the `InboxCustomer` table. All the data in the column will be lost.
  - You are about to drop the column `branchId` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `branchId` on the `Ticket` table. All the data in the column will be lost.
  - You are about to drop the column `departmentId` on the `Ticket` table. All the data in the column will be lost.
  - You are about to drop the `AcademicProduct` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AcademicTerm` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AcademicYear` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Admission` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AdmissionApprovalSnapshot` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AdmissionDocument` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AdmissionDocumentDecision` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AdmissionDocumentPolicyRequirement` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AdmissionDocumentPolicySnapshot` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AdmissionDocumentVersion` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AdmissionEligibilityAssessment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AdmissionFinancialRevision` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AdmissionLifecycleEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AdmissionReferenceCounter` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AdmissionRequestKey` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AdmissionSelectionRevision` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AdmissionTimelineEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Applicant` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BatchBranchAssignment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BatchFinancialRevision` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BatchInstallment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BatchInstallmentPlan` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BatchLifecycleEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BatchOffer` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Branch` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Department` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Discount` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DocumentRequirementDefinition` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DocumentRequirementPolicy` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ExpenseApprovalHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ExpenseAttachment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ExpenseComment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ExpenseRequest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FinanceNumberCounter` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FinanceTimelineEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FinancialAdjustment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Installment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InstallmentPlan` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Invoice` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InvoiceStatusChange` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Payment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductAsset` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductBranchAssignment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductContentItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductLifecycleEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductPricing` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductType` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductTypeField` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProgramBatch` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Refund` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Scholarship` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Student` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StudentCodeCounter` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StudentDocument` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StudentDocumentVersion` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StudentEnrollment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StudentEnrollmentFinancialSnapshot` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StudentFinancialAccount` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StudentIntakeKey` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StudentNote` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StudentStatusChange` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StudentTimelineEvent` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropViews
DROP VIEW IF EXISTS "finance_invoice_balance" CASCADE;
DROP VIEW IF EXISTS "finance_installment_balance" CASCADE;

-- DropFunctions
DROP FUNCTION IF EXISTS admission_assert_current_pointer_ownership() CASCADE;
DROP FUNCTION IF EXISTS admission_assert_document_pointer_ownership() CASCADE;
DROP FUNCTION IF EXISTS admissions_reject_history_mutation() CASCADE;
DROP FUNCTION IF EXISTS finance_reject_history_mutation() CASCADE;
DROP FUNCTION IF EXISTS finance_reject_issued_snapshot_rewrite() CASCADE;
DROP FUNCTION IF EXISTS finance_reject_non_draft_figure_edit() CASCADE;
DROP FUNCTION IF EXISTS finance_reject_invoice_identity_change() CASCADE;
DROP FUNCTION IF EXISTS reject_batch_history_mutation() CASCADE;

-- DropForeignKey
ALTER TABLE IF EXISTS "AcademicProduct" DROP CONSTRAINT IF EXISTS "AcademicProduct_productTypeId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "AcademicTerm" DROP CONSTRAINT IF EXISTS "AcademicTerm_academicYearId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "AcademicYear" DROP CONSTRAINT IF EXISTS "AcademicYear_organizationId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "Admission" DROP CONSTRAINT IF EXISTS "Admission_applicantId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "Admission" DROP CONSTRAINT IF EXISTS "Admission_approvalSnapshotId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "Admission" DROP CONSTRAINT IF EXISTS "Admission_currentDocumentPolicySnapshotId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "Admission" DROP CONSTRAINT IF EXISTS "Admission_currentFinancialRevisionId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "Admission" DROP CONSTRAINT IF EXISTS "Admission_currentSelectionRevisionId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "AdmissionApprovalSnapshot" DROP CONSTRAINT IF EXISTS "AdmissionApprovalSnapshot_admissionId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "AdmissionDocument" DROP CONSTRAINT IF EXISTS "AdmissionDocument_admissionId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "AdmissionDocument" DROP CONSTRAINT IF EXISTS "AdmissionDocument_currentRequirementId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "AdmissionDocument" DROP CONSTRAINT IF EXISTS "AdmissionDocument_currentVersionId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "AdmissionDocumentDecision" DROP CONSTRAINT IF EXISTS "AdmissionDocumentDecision_documentVersionId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "AdmissionDocumentPolicyRequirement" DROP CONSTRAINT IF EXISTS "AdmissionDocumentPolicyRequirement_snapshotId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "AdmissionDocumentPolicySnapshot" DROP CONSTRAINT IF EXISTS "AdmissionDocumentPolicySnapshot_admissionId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "AdmissionDocumentVersion" DROP CONSTRAINT IF EXISTS "AdmissionDocumentVersion_documentId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "AdmissionEligibilityAssessment" DROP CONSTRAINT IF EXISTS "AdmissionEligibilityAssessment_admissionId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "AdmissionFinancialRevision" DROP CONSTRAINT IF EXISTS "AdmissionFinancialRevision_admissionId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "AdmissionLifecycleEvent" DROP CONSTRAINT IF EXISTS "AdmissionLifecycleEvent_admissionId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "AdmissionSelectionRevision" DROP CONSTRAINT IF EXISTS "AdmissionSelectionRevision_admissionId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "AdmissionTimelineEvent" DROP CONSTRAINT IF EXISTS "AdmissionTimelineEvent_admissionId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "BatchBranchAssignment" DROP CONSTRAINT IF EXISTS "BatchBranchAssignment_batchId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "BatchBranchAssignment" DROP CONSTRAINT IF EXISTS "BatchBranchAssignment_branchId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "BatchFinancialRevision" DROP CONSTRAINT IF EXISTS "BatchFinancialRevision_batchId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "BatchInstallment" DROP CONSTRAINT IF EXISTS "BatchInstallment_installmentPlanId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "BatchInstallmentPlan" DROP CONSTRAINT IF EXISTS "BatchInstallmentPlan_financialRevisionId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "BatchLifecycleEvent" DROP CONSTRAINT IF EXISTS "BatchLifecycleEvent_batchId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "BatchOffer" DROP CONSTRAINT IF EXISTS "BatchOffer_financialRevisionId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "Branch" DROP CONSTRAINT IF EXISTS "Branch_organizationId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "Contact" DROP CONSTRAINT IF EXISTS "Contact_branchId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "Department" DROP CONSTRAINT IF EXISTS "Department_organizationId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "Discount" DROP CONSTRAINT IF EXISTS "Discount_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "DocumentRequirementDefinition" DROP CONSTRAINT IF EXISTS "DocumentRequirementDefinition_policyId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "ExpenseApprovalHistory" DROP CONSTRAINT IF EXISTS "ExpenseApprovalHistory_expenseRequestId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "ExpenseAttachment" DROP CONSTRAINT IF EXISTS "ExpenseAttachment_expenseRequestId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "ExpenseComment" DROP CONSTRAINT IF EXISTS "ExpenseComment_expenseRequestId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "FinancialAdjustment" DROP CONSTRAINT IF EXISTS "FinancialAdjustment_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "GeneralSettings" DROP CONSTRAINT IF EXISTS "GeneralSettings_defaultAcademicYearId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "GeneralSettings" DROP CONSTRAINT IF EXISTS "GeneralSettings_defaultBranchId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "InboxChannelConnection" DROP CONSTRAINT IF EXISTS "InboxChannelConnection_branchId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "InboxCustomer" DROP CONSTRAINT IF EXISTS "InboxCustomer_branchId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "Installment" DROP CONSTRAINT IF EXISTS "Installment_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "Installment" DROP CONSTRAINT IF EXISTS "Installment_planId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "InstallmentPlan" DROP CONSTRAINT IF EXISTS "InstallmentPlan_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "Invoice" DROP CONSTRAINT IF EXISTS "Invoice_accountId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "InvoiceStatusChange" DROP CONSTRAINT IF EXISTS "InvoiceStatusChange_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "Lead" DROP CONSTRAINT IF EXISTS "Lead_branchId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "Payment" DROP CONSTRAINT IF EXISTS "Payment_installmentId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "Payment" DROP CONSTRAINT IF EXISTS "Payment_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "ProductAsset" DROP CONSTRAINT IF EXISTS "ProductAsset_productId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "ProductBranchAssignment" DROP CONSTRAINT IF EXISTS "ProductBranchAssignment_productId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "ProductContentItem" DROP CONSTRAINT IF EXISTS "ProductContentItem_productId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "ProductLifecycleEvent" DROP CONSTRAINT IF EXISTS "ProductLifecycleEvent_productId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "ProductPricing" DROP CONSTRAINT IF EXISTS "ProductPricing_productId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "ProductTypeField" DROP CONSTRAINT IF EXISTS "ProductTypeField_productTypeId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "ProgramBatch" DROP CONSTRAINT IF EXISTS "ProgramBatch_academicYearId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "ProgramBatch" DROP CONSTRAINT IF EXISTS "ProgramBatch_currentFinancialRevisionId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "ProgramBatch" DROP CONSTRAINT IF EXISTS "ProgramBatch_intakeId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "ProgramBatch" DROP CONSTRAINT IF EXISTS "ProgramBatch_programId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "Refund" DROP CONSTRAINT IF EXISTS "Refund_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "Refund" DROP CONSTRAINT IF EXISTS "Refund_paymentId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "StudentDocument" DROP CONSTRAINT IF EXISTS "StudentDocument_currentVersionId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "StudentDocument" DROP CONSTRAINT IF EXISTS "StudentDocument_studentId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "StudentDocumentVersion" DROP CONSTRAINT IF EXISTS "StudentDocumentVersion_documentId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "StudentEnrollment" DROP CONSTRAINT IF EXISTS "StudentEnrollment_studentId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "StudentEnrollmentFinancialSnapshot" DROP CONSTRAINT IF EXISTS "StudentEnrollmentFinancialSnapshot_accountId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "StudentNote" DROP CONSTRAINT IF EXISTS "StudentNote_studentId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "StudentStatusChange" DROP CONSTRAINT IF EXISTS "StudentStatusChange_studentId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "StudentTimelineEvent" DROP CONSTRAINT IF EXISTS "StudentTimelineEvent_studentId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "Account_departmentId_idx";

-- DropIndex
DROP INDEX IF EXISTS "Contact_organizationId_branchId_idx";

-- DropIndex
DROP INDEX IF EXISTS "GeneralSettings_defaultAcademicYearId_idx";

-- DropIndex
DROP INDEX IF EXISTS "GeneralSettings_defaultBranchId_idx";

-- DropIndex
DROP INDEX IF EXISTS "InboxChannelConnection_branchId_idx";

-- DropIndex
DROP INDEX IF EXISTS "InboxCustomer_organizationId_branchId_lastActivityAt_idx";

-- DropIndex
DROP INDEX IF EXISTS "Lead_branchId_idx";

-- DropIndex
DROP INDEX IF EXISTS "Ticket_organizationId_branchId_status_idx";

-- AlterTable
ALTER TABLE IF EXISTS "Account" DROP COLUMN IF EXISTS "branchIds",
DROP COLUMN IF EXISTS "departmentId";

-- AlterTable
ALTER TABLE IF EXISTS "Contact" DROP COLUMN IF EXISTS "branchId";

-- AlterTable
ALTER TABLE IF EXISTS "GeneralSettings" DROP COLUMN IF EXISTS "defaultAcademicYearId",
DROP COLUMN IF EXISTS "defaultBranchId";

-- AlterTable
ALTER TABLE IF EXISTS "InboxChannelConnection" DROP COLUMN IF EXISTS "branchId";

-- AlterTable
ALTER TABLE IF EXISTS "InboxCustomer" DROP COLUMN IF EXISTS "branchId";

-- AlterTable
ALTER TABLE IF EXISTS "Lead" DROP COLUMN IF EXISTS "branchId";

-- AlterTable
ALTER TABLE IF EXISTS "Ticket" DROP COLUMN IF EXISTS "branchId",
DROP COLUMN IF EXISTS "departmentId";

-- DropTable
DROP TABLE IF EXISTS "AcademicProduct" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "AcademicTerm" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "AcademicYear" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "Admission" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "AdmissionApprovalSnapshot" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "AdmissionDocument" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "AdmissionDocumentDecision" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "AdmissionDocumentPolicyRequirement" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "AdmissionDocumentPolicySnapshot" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "AdmissionDocumentVersion" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "AdmissionEligibilityAssessment" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "AdmissionFinancialRevision" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "AdmissionLifecycleEvent" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "AdmissionReferenceCounter" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "AdmissionRequestKey" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "AdmissionSelectionRevision" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "AdmissionTimelineEvent" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "Applicant" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "BatchBranchAssignment" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "BatchFinancialRevision" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "BatchInstallment" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "BatchInstallmentPlan" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "BatchLifecycleEvent" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "BatchOffer" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "Branch" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "Department" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "Discount" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "DocumentRequirementDefinition" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "DocumentRequirementPolicy" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "ExpenseApprovalHistory" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "ExpenseAttachment" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "ExpenseComment" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "ExpenseRequest" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "FinanceNumberCounter" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "FinanceTimelineEvent" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "FinancialAdjustment" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "Installment" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "InstallmentPlan" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "Invoice" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "InvoiceStatusChange" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "Payment" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "ProductAsset" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "ProductBranchAssignment" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "ProductContentItem" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "ProductLifecycleEvent" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "ProductPricing" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "ProductType" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "ProductTypeField" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "ProgramBatch" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "Refund" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "Scholarship" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "Student" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "StudentCodeCounter" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "StudentDocument" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "StudentDocumentVersion" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "StudentEnrollment" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "StudentEnrollmentFinancialSnapshot" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "StudentFinancialAccount" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "StudentIntakeKey" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "StudentNote" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "StudentStatusChange" CASCADE;

-- DropTable
DROP TABLE IF EXISTS "StudentTimelineEvent" CASCADE;

-- DropEnum
DROP TYPE IF EXISTS "AdmissionDocumentDecisionKind" CASCADE;

-- DropEnum
DROP TYPE IF EXISTS "AdmissionDocumentVersionStatus" CASCADE;

-- DropEnum
DROP TYPE IF EXISTS "AdmissionOfferingKind" CASCADE;

-- DropEnum
DROP TYPE IF EXISTS "AdmissionRequestStatus" CASCADE;

-- DropEnum
DROP TYPE IF EXISTS "AdmissionStatus" CASCADE;

-- DropEnum
DROP TYPE IF EXISTS "AdmissionTimelineEventKind" CASCADE;

-- DropEnum
DROP TYPE IF EXISTS "ApplicantStatus" CASCADE;

-- DropEnum
DROP TYPE IF EXISTS "BatchBranchRole" CASCADE;

-- DropEnum
DROP TYPE IF EXISTS "BatchOfferKind" CASCADE;

-- DropEnum
DROP TYPE IF EXISTS "BatchStatus" CASCADE;

-- DropEnum
DROP TYPE IF EXISTS "BatchValueType" CASCADE;

-- DropEnum
DROP TYPE IF EXISTS "ConfigurationStatus" CASCADE;

-- DropEnum
DROP TYPE IF EXISTS "CoveredCharge" CASCADE;

-- DropEnum
DROP TYPE IF EXISTS "DiscountMode" CASCADE;

-- DropEnum
DROP TYPE IF EXISTS "DocumentPolicyModule" CASCADE;

-- DropEnum
DROP TYPE IF EXISTS "EligibilityContext" CASCADE;

-- DropEnum
DROP TYPE IF EXISTS "ExpenseApprovalAction" CASCADE;

-- DropEnum
DROP TYPE IF EXISTS "ExpenseStatus" CASCADE;

-- DropEnum
DROP TYPE IF EXISTS "FinanceEventCategory" CASCADE;

-- DropEnum
DROP TYPE IF EXISTS "FinanceInstallmentStatus" CASCADE;

-- DropEnum
DROP TYPE IF EXISTS "FinanceInvoiceStatus" CASCADE;

-- DropEnum
DROP TYPE IF EXISTS "FinanceOfferingKind" CASCADE;

-- DropEnum
DROP TYPE IF EXISTS "FinanceReductionKind" CASCADE;

-- DropEnum
DROP TYPE IF EXISTS "FinanceReductionSourceKind" CASCADE;

-- DropEnum
DROP TYPE IF EXISTS "FinanceRefundStatus" CASCADE;

-- DropEnum
DROP TYPE IF EXISTS "FinanceScheduleBasis" CASCADE;

-- DropEnum
DROP TYPE IF EXISTS "FinanceScholarshipCoverage" CASCADE;

-- DropEnum
DROP TYPE IF EXISTS "FinanceSequenceKind" CASCADE;

-- DropEnum
DROP TYPE IF EXISTS "FinancialSourceKind" CASCADE;

-- DropEnum
DROP TYPE IF EXISTS "InstallmentBasis" CASCADE;

-- DropEnum
DROP TYPE IF EXISTS "InstallmentFrequency" CASCADE;

-- DropEnum
DROP TYPE IF EXISTS "ProductAssetKind" CASCADE;

-- DropEnum
DROP TYPE IF EXISTS "ProductBranchRole" CASCADE;

-- DropEnum
DROP TYPE IF EXISTS "ProductContentKind" CASCADE;

-- DropEnum
DROP TYPE IF EXISTS "ProductFieldKind" CASCADE;

-- DropEnum
DROP TYPE IF EXISTS "ProductStatus" CASCADE;

-- DropEnum
DROP TYPE IF EXISTS "ProductTypeIdentity" CASCADE;

-- DropEnum
DROP TYPE IF EXISTS "StudentDocumentState" CASCADE;

-- DropEnum
DROP TYPE IF EXISTS "StudentEnrollmentStatus" CASCADE;

-- DropEnum
DROP TYPE IF EXISTS "StudentOfferingKind" CASCADE;

-- DropEnum
DROP TYPE IF EXISTS "StudentStatus" CASCADE;

-- DropEnum
DROP TYPE IF EXISTS "StudentTimelineCategory" CASCADE;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InboxCustomer_organizationId_lastActivityAt_idx" ON "InboxCustomer"("organizationId", "lastActivityAt");
