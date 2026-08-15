-- AlterEnum
ALTER TYPE "ExpenseApprovalAction" ADD VALUE 'PAY';

-- AlterEnum
ALTER TYPE "ExpenseStatus" ADD VALUE 'PAID';

-- AlterTable
ALTER TABLE "LookupValue" ADD COLUMN     "description" TEXT;

-- CreateTable
CREATE TABLE "ExpenseComment" (
    "id" TEXT NOT NULL,
    "expenseRequestId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "authorId" UUID NOT NULL,
    "authorName" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExpenseComment_expenseRequestId_createdAt_idx" ON "ExpenseComment"("expenseRequestId", "createdAt");

-- CreateIndex
CREATE INDEX "ExpenseComment_authorId_idx" ON "ExpenseComment"("authorId");

-- AddForeignKey
ALTER TABLE "ExpenseComment" ADD CONSTRAINT "ExpenseComment_expenseRequestId_fkey" FOREIGN KEY ("expenseRequestId") REFERENCES "ExpenseRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
