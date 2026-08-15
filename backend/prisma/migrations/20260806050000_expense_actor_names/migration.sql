-- AlterTable
ALTER TABLE "ExpenseApprovalHistory" ADD COLUMN     "performedByName" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "ExpenseAttachment" ADD COLUMN     "uploadedByName" TEXT NOT NULL DEFAULT '';

