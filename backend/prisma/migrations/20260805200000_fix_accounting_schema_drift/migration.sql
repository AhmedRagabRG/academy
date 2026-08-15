-- AlterEnum
BEGIN;
CREATE TYPE "ExpenseApprovalAction_new" AS ENUM ('CREATE', 'SUBMIT', 'REVIEW', 'APPROVE', 'REJECT', 'RETURN', 'ARCHIVE');
ALTER TABLE "ExpenseApprovalHistory" ALTER COLUMN "action" TYPE "ExpenseApprovalAction_new" USING ("action"::text::"ExpenseApprovalAction_new");
ALTER TYPE "ExpenseApprovalAction" RENAME TO "ExpenseApprovalAction_old";
ALTER TYPE "ExpenseApprovalAction_new" RENAME TO "ExpenseApprovalAction";
DROP TYPE "public"."ExpenseApprovalAction_old";
COMMIT;

-- DropIndex
DROP INDEX "ExpenseAttachment_uploadAttemptId_idx";

-- DropIndex
DROP INDEX "ExpenseRequest_expenseDate_idx";

-- AlterTable
ALTER TABLE "AcademicProduct" DROP COLUMN "landingPage";

-- AlterTable
ALTER TABLE "ExpenseApprovalHistory" DROP COLUMN "previousStatus",
ADD COLUMN     "previousStatus" TEXT,
DROP COLUMN "newStatus",
ADD COLUMN     "newStatus" TEXT NOT NULL,
DROP COLUMN "performedById",
ADD COLUMN     "performedById" UUID NOT NULL;

-- AlterTable
ALTER TABLE "ExpenseAttachment" ALTER COLUMN "fileSize" SET DATA TYPE INTEGER,
DROP COLUMN "uploadedById",
ADD COLUMN     "uploadedById" UUID NOT NULL;

-- AlterTable
ALTER TABLE "ExpenseRequest" DROP COLUMN "amountMinor",
DROP COLUMN "branchId",
ADD COLUMN     "branchId" UUID NOT NULL,
DROP COLUMN "categoryId",
ADD COLUMN     "categoryId" UUID NOT NULL,
DROP COLUMN "subcategoryId",
ADD COLUMN     "subcategoryId" UUID NOT NULL,
DROP COLUMN "requestedById",
ADD COLUMN     "requestedById" UUID NOT NULL,
ALTER COLUMN "expenseDate" SET DATA TYPE DATE;

-- CreateIndex
CREATE INDEX "ExpenseApprovalHistory_performedById_idx" ON "ExpenseApprovalHistory"("performedById");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseAttachment_uploadAttemptId_key" ON "ExpenseAttachment"("uploadAttemptId");

-- CreateIndex
CREATE INDEX "ExpenseAttachment_uploadedById_idx" ON "ExpenseAttachment"("uploadedById");

-- CreateIndex
CREATE INDEX "ExpenseRequest_branchId_idx" ON "ExpenseRequest"("branchId");

-- CreateIndex
CREATE INDEX "ExpenseRequest_categoryId_idx" ON "ExpenseRequest"("categoryId");

-- CreateIndex
CREATE INDEX "ExpenseRequest_subcategoryId_idx" ON "ExpenseRequest"("subcategoryId");

-- CreateIndex
CREATE INDEX "ExpenseRequest_requestedById_idx" ON "ExpenseRequest"("requestedById");

-- CreateIndex
CREATE INDEX "ExpenseRequest_isArchived_idx" ON "ExpenseRequest"("isArchived");

-- CreateIndex
CREATE INDEX "ExpenseRequest_createdAt_idx" ON "ExpenseRequest"("createdAt");

-- CreateIndex
CREATE INDEX "ExpenseRequest_branchId_status_idx" ON "ExpenseRequest"("branchId", "status");

