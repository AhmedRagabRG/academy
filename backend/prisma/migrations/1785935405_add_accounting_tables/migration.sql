-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'RETURNED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ExpenseApprovalAction" AS ENUM ('CREATED', 'UPDATED', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'RETURNED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "ExpenseRequest" (
    "id" TEXT NOT NULL,
    "expenseNumber" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "subcategoryId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL,
    "precision" INTEGER NOT NULL,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'DRAFT',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExpenseRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseAttachment" (
    "id" TEXT NOT NULL,
    "expenseRequestId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileReference" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "uploadAttemptId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseApprovalHistory" (
    "id" TEXT NOT NULL,
    "expenseRequestId" TEXT NOT NULL,
    "action" "ExpenseApprovalAction" NOT NULL,
    "previousStatus" "ExpenseStatus",
    "newStatus" "ExpenseStatus" NOT NULL,
    "performedById" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "comment" TEXT,

    CONSTRAINT "ExpenseApprovalHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseRequest_expenseNumber_key" ON "ExpenseRequest"("expenseNumber");

-- CreateIndex
CREATE INDEX "ExpenseRequest_branchId_idx" ON "ExpenseRequest"("branchId");

-- CreateIndex
CREATE INDEX "ExpenseRequest_categoryId_idx" ON "ExpenseRequest"("categoryId");

-- CreateIndex
CREATE INDEX "ExpenseRequest_subcategoryId_idx" ON "ExpenseRequest"("subcategoryId");

-- CreateIndex
CREATE INDEX "ExpenseRequest_requestedById_idx" ON "ExpenseRequest"("requestedById");

-- CreateIndex
CREATE INDEX "ExpenseRequest_status_idx" ON "ExpenseRequest"("status");

-- CreateIndex
CREATE INDEX "ExpenseRequest_expenseDate_idx" ON "ExpenseRequest"("expenseDate");

-- CreateIndex
CREATE INDEX "ExpenseAttachment_expenseRequestId_idx" ON "ExpenseAttachment"("expenseRequestId");

-- CreateIndex
CREATE INDEX "ExpenseAttachment_uploadAttemptId_idx" ON "ExpenseAttachment"("uploadAttemptId");

-- CreateIndex
CREATE INDEX "ExpenseApprovalHistory_expenseRequestId_idx" ON "ExpenseApprovalHistory"("expenseRequestId");

-- CreateIndex
CREATE INDEX "ExpenseApprovalHistory_performedById_idx" ON "ExpenseApprovalHistory"("performedById");

-- CreateIndex
CREATE INDEX "ExpenseApprovalHistory_performedAt_idx" ON "ExpenseApprovalHistory"("performedAt");

-- AddForeignKey
ALTER TABLE "ExpenseAttachment" ADD CONSTRAINT "ExpenseAttachment_expenseRequestId_fkey" FOREIGN KEY ("expenseRequestId") REFERENCES "ExpenseRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseApprovalHistory" ADD CONSTRAINT "ExpenseApprovalHistory_expenseRequestId_fkey" FOREIGN KEY ("expenseRequestId") REFERENCES "ExpenseRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
