-- Student Finance (module 009)
--
-- Money is BigInt minor units throughout. Balances are NOT stored: the
-- finance_invoice_balance view at the end of this file projects
-- final/collected/netPaid/remaining/derivedStatus/isOverdue from the base
-- tables on demand, so there is no second source of truth that can drift.

-- CreateEnum
CREATE TYPE "FinanceOfferingKind" AS ENUM ('PROFESSIONAL_PROGRAM', 'PROFESSIONAL_DIPLOMA', 'TRAINING_COURSE');
CREATE TYPE "FinanceInvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED');
CREATE TYPE "FinanceInstallmentStatus" AS ENUM ('PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE');
CREATE TYPE "FinanceRefundStatus" AS ENUM ('REQUESTED', 'APPROVED', 'COMPLETED', 'REJECTED', 'CANCELLED');
CREATE TYPE "FinanceReductionKind" AS ENUM ('PERCENTAGE', 'AMOUNT');
CREATE TYPE "FinanceScholarshipCoverage" AS ENUM ('FULL_TUITION', 'PARTIAL_TUITION');
CREATE TYPE "FinanceScheduleBasis" AS ENUM ('MONTHLY', 'CUSTOM');
CREATE TYPE "FinanceReductionSourceKind" AS ENUM ('DISCOUNT', 'SCHOLARSHIP');
CREATE TYPE "FinanceEventCategory" AS ENUM ('INVOICE_CREATED', 'INVOICE_ISSUED', 'INVOICE_CANCELLED', 'INSTALLMENT_PLAN_GENERATED', 'PAYMENT_RECEIVED', 'DISCOUNT_APPLIED', 'SCHOLARSHIP_APPLIED', 'ADJUSTMENT_RECORDED', 'REFUND_REQUESTED', 'REFUND_COMPLETED');
CREATE TYPE "FinanceSequenceKind" AS ENUM ('INVOICE', 'RECEIPT');

-- CreateTable
CREATE TABLE "StudentFinancialAccount" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "studentCode" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "searchName" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "precision" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID NOT NULL,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "updatedById" UUID NOT NULL,

    CONSTRAINT "StudentFinancialAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentEnrollmentFinancialSnapshot" (
    "id" UUID NOT NULL,
    "accountId" UUID NOT NULL,
    "enrollmentId" UUID NOT NULL,
    "offeringId" UUID NOT NULL,
    "offeringKind" "FinanceOfferingKind" NOT NULL,
    "offeringLabel" TEXT NOT NULL,
    "batchId" UUID,
    "batchLabel" TEXT,
    "branchId" UUID NOT NULL,
    "sourceAdmissionId" UUID NOT NULL,
    "sourceApprovalSnapshotId" UUID NOT NULL,
    "sourceFinancialRevisionId" UUID NOT NULL,
    "tuitionMinor" BIGINT NOT NULL,
    "registrationFeesMinor" BIGINT NOT NULL,
    "admissionDiscountMinor" BIGINT NOT NULL DEFAULT 0,
    "requiredAmountMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL,
    "precision" INTEGER NOT NULL,
    "snapshotAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "snapshotById" UUID NOT NULL,

    CONSTRAINT "StudentEnrollmentFinancialSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Invoice" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "accountId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "studentCode" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "searchName" TEXT NOT NULL,
    "enrollmentId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "offeringId" UUID NOT NULL,
    "offeringLabel" TEXT NOT NULL,
    "offeringKind" "FinanceOfferingKind" NOT NULL,
    "batchId" UUID,
    "batchLabel" TEXT,
    "chargePurposeValueId" UUID NOT NULL,
    "chargePurposeCode" TEXT NOT NULL,
    "issueDate" DATE,
    "dueDate" DATE NOT NULL,
    "currency" TEXT NOT NULL,
    "precision" INTEGER NOT NULL,
    "draftTotalMinor" BIGINT NOT NULL,
    "draftDiscountTotalMinor" BIGINT NOT NULL DEFAULT 0,
    "draftScholarshipTotalMinor" BIGINT NOT NULL DEFAULT 0,
    "draftFinalMinor" BIGINT NOT NULL,
    "issuedTotalMinor" BIGINT,
    "issuedDiscountTotalMinor" BIGINT,
    "issuedScholarshipTotalMinor" BIGINT,
    "issuedFinalMinor" BIGINT,
    "status" "FinanceInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "cancelledAt" TIMESTAMPTZ,
    "cancelReason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" UUID NOT NULL,
    "createdByName" TEXT NOT NULL,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "updatedById" UUID NOT NULL,
    "updatedByName" TEXT NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InvoiceStatusChange" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "fromStatus" "FinanceInvoiceStatus",
    "toStatus" "FinanceInvoiceStatus" NOT NULL,
    "reason" TEXT,
    "actorId" UUID NOT NULL,
    "actorName" TEXT NOT NULL,
    "occurredAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resultInvoiceVersion" INTEGER NOT NULL,

    CONSTRAINT "InvoiceStatusChange_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InstallmentPlan" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "count" INTEGER NOT NULL,
    "scheduleBasis" "FinanceScheduleBasis" NOT NULL,
    "firstDueDate" DATE NOT NULL,
    "generatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedById" UUID NOT NULL,
    "generatedByName" TEXT NOT NULL,

    CONSTRAINT "InstallmentPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Installment" (
    "id" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "dueDate" DATE NOT NULL,
    "amountMinor" BIGINT NOT NULL,

    CONSTRAINT "Installment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Payment" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "studentId" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "installmentId" UUID,
    "branchId" UUID NOT NULL,
    "methodId" UUID NOT NULL,
    "paymentDate" DATE NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL,
    "precision" INTEGER NOT NULL,
    "notes" TEXT,
    "recordedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" UUID NOT NULL,
    "recordedByName" TEXT NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Discount" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "kind" "FinanceReductionKind" NOT NULL,
    "value" BIGINT NOT NULL,
    "reason" TEXT NOT NULL,
    "approvedById" UUID NOT NULL,
    "approvedByName" TEXT NOT NULL,
    "approvedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Discount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Scholarship" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "enrollmentId" UUID,
    "name" TEXT NOT NULL,
    "kind" "FinanceReductionKind" NOT NULL,
    "value" BIGINT NOT NULL,
    "coverage" "FinanceScholarshipCoverage" NOT NULL,
    "reason" TEXT NOT NULL,
    "approvedById" UUID NOT NULL,
    "approvedByName" TEXT NOT NULL,
    "approvedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Scholarship_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinancialAdjustment" (
    "id" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "sourceKind" "FinanceReductionSourceKind" NOT NULL,
    "sourceId" UUID NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL,
    "precision" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "approvedById" UUID NOT NULL,
    "approvedByName" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialAdjustment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Refund" (
    "id" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL,
    "precision" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "refundDate" DATE NOT NULL,
    "status" "FinanceRefundStatus" NOT NULL DEFAULT 'REQUESTED',
    "requestedById" UUID NOT NULL,
    "requestedByName" TEXT NOT NULL,
    "requestedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedById" UUID,
    "decidedByName" TEXT,
    "decidedAt" TIMESTAMPTZ,
    "decisionReason" TEXT,
    "completedAt" TIMESTAMPTZ,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinanceTimelineEvent" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "invoiceId" UUID,
    "category" "FinanceEventCategory" NOT NULL,
    "occurredAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sequence" INTEGER NOT NULL,
    "actorId" UUID NOT NULL,
    "actorName" TEXT NOT NULL,
    "subjectRef" TEXT,
    "amountMinor" BIGINT,
    "currency" TEXT,
    "precision" INTEGER,
    "summary" TEXT NOT NULL,

    CONSTRAINT "FinanceTimelineEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinanceNumberCounter" (
    "organizationId" UUID NOT NULL,
    "sequenceKind" "FinanceSequenceKind" NOT NULL,
    "year" INTEGER NOT NULL,
    "lastValue" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "FinanceNumberCounter_pkey" PRIMARY KEY ("organizationId", "sequenceKind", "year")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentFinancialAccount_studentId_key" ON "StudentFinancialAccount"("studentId");
CREATE INDEX "StudentFinancialAccount_organizationId_searchName_idx" ON "StudentFinancialAccount"("organizationId", "searchName");
CREATE INDEX "StudentFinancialAccount_organizationId_studentCode_idx" ON "StudentFinancialAccount"("organizationId", "studentCode");

CREATE UNIQUE INDEX "StudentEnrollmentFinancialSnapshot_enrollmentId_key" ON "StudentEnrollmentFinancialSnapshot"("enrollmentId");
CREATE INDEX "StudentEnrollmentFinancialSnapshot_accountId_idx" ON "StudentEnrollmentFinancialSnapshot"("accountId");
CREATE INDEX "StudentEnrollmentFinancialSnapshot_offeringId_idx" ON "StudentEnrollmentFinancialSnapshot"("offeringId");
CREATE INDEX "StudentEnrollmentFinancialSnapshot_batchId_idx" ON "StudentEnrollmentFinancialSnapshot"("batchId");

CREATE UNIQUE INDEX "Invoice_organizationId_invoiceNumber_key" ON "Invoice"("organizationId", "invoiceNumber");
-- The raise operation is idempotent in the database, not by an application
-- read-then-write check that two concurrent requests could both pass.
CREATE UNIQUE INDEX "Invoice_enrollmentId_chargePurposeValueId_key" ON "Invoice"("enrollmentId", "chargePurposeValueId");
CREATE INDEX "Invoice_organizationId_branchId_status_idx" ON "Invoice"("organizationId", "branchId", "status");
CREATE INDEX "Invoice_organizationId_studentId_idx" ON "Invoice"("organizationId", "studentId");
CREATE INDEX "Invoice_organizationId_dueDate_idx" ON "Invoice"("organizationId", "dueDate");
CREATE INDEX "Invoice_organizationId_issueDate_idx" ON "Invoice"("organizationId", "issueDate");
CREATE INDEX "Invoice_organizationId_offeringId_idx" ON "Invoice"("organizationId", "offeringId");
CREATE INDEX "Invoice_organizationId_batchId_idx" ON "Invoice"("organizationId", "batchId");
CREATE INDEX "Invoice_organizationId_updatedAt_idx" ON "Invoice"("organizationId", "updatedAt");
CREATE INDEX "Invoice_searchName_idx" ON "Invoice"("searchName");
CREATE INDEX "Invoice_accountId_idx" ON "Invoice"("accountId");

CREATE UNIQUE INDEX "InvoiceStatusChange_invoiceId_resultInvoiceVersion_key" ON "InvoiceStatusChange"("invoiceId", "resultInvoiceVersion");
CREATE INDEX "InvoiceStatusChange_invoiceId_occurredAt_idx" ON "InvoiceStatusChange"("invoiceId", "occurredAt");

CREATE UNIQUE INDEX "InstallmentPlan_invoiceId_key" ON "InstallmentPlan"("invoiceId");

CREATE UNIQUE INDEX "Installment_planId_sequence_key" ON "Installment"("planId", "sequence");
CREATE INDEX "Installment_invoiceId_idx" ON "Installment"("invoiceId");
CREATE INDEX "Installment_dueDate_idx" ON "Installment"("dueDate");

CREATE UNIQUE INDEX "Payment_organizationId_receiptNumber_key" ON "Payment"("organizationId", "receiptNumber");
CREATE INDEX "Payment_invoiceId_idx" ON "Payment"("invoiceId");
CREATE INDEX "Payment_installmentId_idx" ON "Payment"("installmentId");
CREATE INDEX "Payment_organizationId_studentId_idx" ON "Payment"("organizationId", "studentId");
CREATE INDEX "Payment_organizationId_paymentDate_idx" ON "Payment"("organizationId", "paymentDate");
CREATE INDEX "Payment_organizationId_methodId_idx" ON "Payment"("organizationId", "methodId");
CREATE INDEX "Payment_organizationId_branchId_idx" ON "Payment"("organizationId", "branchId");

CREATE INDEX "Discount_invoiceId_idx" ON "Discount"("invoiceId");

CREATE INDEX "Scholarship_organizationId_studentId_idx" ON "Scholarship"("organizationId", "studentId");
CREATE INDEX "Scholarship_enrollmentId_idx" ON "Scholarship"("enrollmentId");

CREATE INDEX "FinancialAdjustment_invoiceId_idx" ON "FinancialAdjustment"("invoiceId");

CREATE INDEX "Refund_paymentId_status_idx" ON "Refund"("paymentId", "status");
CREATE INDEX "Refund_invoiceId_idx" ON "Refund"("invoiceId");
CREATE INDEX "Refund_organizationId_studentId_idx" ON "Refund"("organizationId", "studentId");
CREATE INDEX "Refund_organizationId_refundDate_idx" ON "Refund"("organizationId", "refundDate");
CREATE INDEX "Refund_organizationId_status_idx" ON "Refund"("organizationId", "status");
CREATE INDEX "Refund_organizationId_branchId_idx" ON "Refund"("organizationId", "branchId");

CREATE UNIQUE INDEX "FinanceTimelineEvent_studentId_sequence_key" ON "FinanceTimelineEvent"("studentId", "sequence");
CREATE INDEX "FinanceTimelineEvent_studentId_sequence_idx" ON "FinanceTimelineEvent"("studentId", "sequence" DESC);
CREATE INDEX "FinanceTimelineEvent_organizationId_category_idx" ON "FinanceTimelineEvent"("organizationId", "category");

-- AddForeignKey
ALTER TABLE "StudentEnrollmentFinancialSnapshot" ADD CONSTRAINT "StudentEnrollmentFinancialSnapshot_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "StudentFinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "StudentFinancialAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InvoiceStatusChange" ADD CONSTRAINT "InvoiceStatusChange_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InstallmentPlan" ADD CONSTRAINT "InstallmentPlan_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Installment" ADD CONSTRAINT "Installment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "InstallmentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Installment" ADD CONSTRAINT "Installment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "Installment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Discount" ADD CONSTRAINT "Discount_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancialAdjustment" ADD CONSTRAINT "FinancialAdjustment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Value constraints. Money is never negative, percentages are bounded, and the
-- stored invoice status can never be a derived one.
-- ---------------------------------------------------------------------------

ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_amounts_non_negative" CHECK (
  "draftTotalMinor" >= 0 AND "draftDiscountTotalMinor" >= 0
  AND "draftScholarshipTotalMinor" >= 0 AND "draftFinalMinor" >= 0
  AND ("issuedTotalMinor" IS NULL OR "issuedTotalMinor" >= 0)
  AND ("issuedFinalMinor" IS NULL OR "issuedFinalMinor" >= 0)
);

-- PARTIALLY_PAID and PAID are consequences of recorded money, derived on read.
-- Restricting the stored column makes "never settable" structural.
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_stored_status_not_derived" CHECK (
  "status" IN ('DRAFT', 'ISSUED', 'CANCELLED')
);

-- The four issued columns are written together or not at all.
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_issued_snapshot_complete" CHECK (
  ("issuedTotalMinor" IS NULL AND "issuedDiscountTotalMinor" IS NULL
    AND "issuedScholarshipTotalMinor" IS NULL AND "issuedFinalMinor" IS NULL)
  OR ("issuedTotalMinor" IS NOT NULL AND "issuedDiscountTotalMinor" IS NOT NULL
    AND "issuedScholarshipTotalMinor" IS NOT NULL AND "issuedFinalMinor" IS NOT NULL)
);

-- An issued or later invoice always carries both an issue date and a snapshot.
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_issued_requires_date" CHECK (
  "status" <> 'ISSUED' OR ("issueDate" IS NOT NULL AND "issuedFinalMinor" IS NOT NULL)
);

ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_cancel_requires_reason" CHECK (
  "status" <> 'CANCELLED' OR (char_length(btrim("cancelReason")) >= 3)
);

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_amount_positive" CHECK ("amountMinor" > 0);
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_notes_bounded" CHECK ("notes" IS NULL OR char_length("notes") <= 500);

ALTER TABLE "Installment" ADD CONSTRAINT "Installment_amount_positive" CHECK ("amountMinor" > 0);
ALTER TABLE "Installment" ADD CONSTRAINT "Installment_sequence_positive" CHECK ("sequence" >= 1);

ALTER TABLE "InstallmentPlan" ADD CONSTRAINT "InstallmentPlan_count_positive" CHECK ("count" >= 1);

-- Percentage values are scaled by 100, so 100% is 10000.
ALTER TABLE "Discount" ADD CONSTRAINT "Discount_value_bounded" CHECK (
  "value" > 0 AND ("kind" <> 'PERCENTAGE' OR "value" <= 10000)
);
ALTER TABLE "Discount" ADD CONSTRAINT "Discount_reason_present" CHECK (char_length(btrim("reason")) >= 3);

ALTER TABLE "Scholarship" ADD CONSTRAINT "Scholarship_value_bounded" CHECK (
  "value" > 0 AND ("kind" <> 'PERCENTAGE' OR "value" <= 10000)
);
ALTER TABLE "Scholarship" ADD CONSTRAINT "Scholarship_reason_present" CHECK (char_length(btrim("reason")) >= 3);
ALTER TABLE "Scholarship" ADD CONSTRAINT "Scholarship_name_present" CHECK (char_length(btrim("name")) >= 2);

ALTER TABLE "FinancialAdjustment" ADD CONSTRAINT "FinancialAdjustment_amount_positive" CHECK ("amountMinor" > 0);

ALTER TABLE "Refund" ADD CONSTRAINT "Refund_amount_positive" CHECK ("amountMinor" > 0);
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_reason_present" CHECK (char_length(btrim("reason")) >= 3);
-- Rejection and cancellation always carry a reason; completion always a time.
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_decision_reason" CHECK (
  "status" NOT IN ('REJECTED', 'CANCELLED') OR char_length(btrim("decisionReason")) >= 3
);
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_completed_time" CHECK (
  "status" <> 'COMPLETED' OR "completedAt" IS NOT NULL
);

ALTER TABLE "FinanceTimelineEvent" ADD CONSTRAINT "FinanceTimelineEvent_sequence_positive" CHECK ("sequence" >= 1);

-- ---------------------------------------------------------------------------
-- Immutability. Enforced by the database so a future migration, repair script
-- or repository refactor cannot rewrite settled financial history.
-- ---------------------------------------------------------------------------

CREATE FUNCTION finance_reject_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION '% is append-only', TG_TABLE_NAME; END $$;

CREATE TRIGGER "Payment_append_only" BEFORE UPDATE OR DELETE ON "Payment" FOR EACH ROW EXECUTE FUNCTION finance_reject_history_mutation();
CREATE TRIGGER "InvoiceStatusChange_append_only" BEFORE UPDATE OR DELETE ON "InvoiceStatusChange" FOR EACH ROW EXECUTE FUNCTION finance_reject_history_mutation();
CREATE TRIGGER "Discount_append_only" BEFORE UPDATE OR DELETE ON "Discount" FOR EACH ROW EXECUTE FUNCTION finance_reject_history_mutation();
CREATE TRIGGER "Scholarship_append_only" BEFORE UPDATE OR DELETE ON "Scholarship" FOR EACH ROW EXECUTE FUNCTION finance_reject_history_mutation();
CREATE TRIGGER "FinancialAdjustment_append_only" BEFORE UPDATE OR DELETE ON "FinancialAdjustment" FOR EACH ROW EXECUTE FUNCTION finance_reject_history_mutation();
CREATE TRIGGER "FinanceTimelineEvent_append_only" BEFORE UPDATE OR DELETE ON "FinanceTimelineEvent" FOR EACH ROW EXECUTE FUNCTION finance_reject_history_mutation();
CREATE TRIGGER "StudentEnrollmentFinancialSnapshot_append_only" BEFORE UPDATE OR DELETE ON "StudentEnrollmentFinancialSnapshot" FOR EACH ROW EXECUTE FUNCTION finance_reject_history_mutation();

-- The issued snapshot is written exactly once. Any later UPDATE that changes a
-- non-null issued column is rejected, whatever layer attempts it.
CREATE FUNCTION finance_reject_issued_snapshot_rewrite() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."issuedFinalMinor" IS NOT NULL AND (
       NEW."issuedTotalMinor" IS DISTINCT FROM OLD."issuedTotalMinor"
    OR NEW."issuedDiscountTotalMinor" IS DISTINCT FROM OLD."issuedDiscountTotalMinor"
    OR NEW."issuedScholarshipTotalMinor" IS DISTINCT FROM OLD."issuedScholarshipTotalMinor"
    OR NEW."issuedFinalMinor" IS DISTINCT FROM OLD."issuedFinalMinor"
    OR NEW."issueDate" IS DISTINCT FROM OLD."issueDate"
  ) THEN
    RAISE EXCEPTION 'issued snapshot is write-once and cannot be modified';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "Invoice_issued_snapshot_write_once" BEFORE UPDATE ON "Invoice" FOR EACH ROW EXECUTE FUNCTION finance_reject_issued_snapshot_rewrite();

-- Draft figures are editable only while the invoice is a draft.
CREATE FUNCTION finance_reject_non_draft_figure_edit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."status" <> 'DRAFT' AND (
       NEW."draftTotalMinor" IS DISTINCT FROM OLD."draftTotalMinor"
    OR NEW."draftDiscountTotalMinor" IS DISTINCT FROM OLD."draftDiscountTotalMinor"
    OR NEW."draftScholarshipTotalMinor" IS DISTINCT FROM OLD."draftScholarshipTotalMinor"
    OR NEW."draftFinalMinor" IS DISTINCT FROM OLD."draftFinalMinor"
  ) THEN
    RAISE EXCEPTION 'draft figures are editable only while the invoice is a draft';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "Invoice_draft_figures_draft_only" BEFORE UPDATE ON "Invoice" FOR EACH ROW EXECUTE FUNCTION finance_reject_non_draft_figure_edit();

-- Identity is fixed at raise time.
CREATE FUNCTION finance_reject_invoice_identity_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."invoiceNumber" IS DISTINCT FROM OLD."invoiceNumber"
     OR NEW."studentId" IS DISTINCT FROM OLD."studentId"
     OR NEW."enrollmentId" IS DISTINCT FROM OLD."enrollmentId"
     OR NEW."offeringId" IS DISTINCT FROM OLD."offeringId"
     OR NEW."chargePurposeValueId" IS DISTINCT FROM OLD."chargePurposeValueId"
     OR NEW."currency" IS DISTINCT FROM OLD."currency"
     OR NEW."precision" IS DISTINCT FROM OLD."precision" THEN
    RAISE EXCEPTION 'invoice identity and currency are fixed at raise time';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "Invoice_identity_immutable" BEFORE UPDATE ON "Invoice" FOR EACH ROW EXECUTE FUNCTION finance_reject_invoice_identity_change();

-- ---------------------------------------------------------------------------
-- finance_invoice_balance — the single derivation.
--
-- A view stores no rows, so it cannot drift from the records that produce it.
-- Every read path uses this one definition: the list (including the documented
-- `remaining` sort), the detail block, the dashboard aggregate, the student
-- statement, and the in-transaction re-check before a payment or reduction.
-- ---------------------------------------------------------------------------

CREATE VIEW finance_invoice_balance AS
SELECT
  i.id                                        AS invoice_id,
  i."organizationId"                          AS organization_id,
  i.currency                                  AS currency,
  i.precision                                 AS precision,
  -- Effective figures: the frozen snapshot once issued, the draft before that,
  -- less every post-issuance adjustment. Never below zero.
  GREATEST(COALESCE(i."issuedFinalMinor", i."draftFinalMinor") - COALESCE(adj.total, 0), 0) AS final_minor,
  COALESCE(pay.total, 0)                      AS collected_minor,
  COALESCE(ref.total, 0)                      AS refunded_minor,
  COALESCE(pay.total, 0) - COALESCE(ref.total, 0) AS net_paid_minor,
  GREATEST(
    GREATEST(COALESCE(i."issuedFinalMinor", i."draftFinalMinor") - COALESCE(adj.total, 0), 0)
      - (COALESCE(pay.total, 0) - COALESCE(ref.total, 0)),
    0
  )                                           AS remaining_minor,
  CASE
    WHEN i.status = 'CANCELLED' THEN 'CANCELLED'::"FinanceInvoiceStatus"
    WHEN i.status = 'DRAFT' THEN 'DRAFT'::"FinanceInvoiceStatus"
    WHEN GREATEST(
           GREATEST(COALESCE(i."issuedFinalMinor", i."draftFinalMinor") - COALESCE(adj.total, 0), 0)
             - (COALESCE(pay.total, 0) - COALESCE(ref.total, 0)),
           0
         ) = 0 THEN 'PAID'::"FinanceInvoiceStatus"
    WHEN (COALESCE(pay.total, 0) - COALESCE(ref.total, 0)) > 0 THEN 'PARTIALLY_PAID'::"FinanceInvoiceStatus"
    ELSE i.status
  END                                         AS derived_status,
  -- Overdue is a function of the due date and what is still owed, which is why
  -- it is derived here rather than stored and swept by a scheduler.
  (
    i.status = 'ISSUED'
    AND i."dueDate" < CURRENT_DATE
    AND GREATEST(
          GREATEST(COALESCE(i."issuedFinalMinor", i."draftFinalMinor") - COALESCE(adj.total, 0), 0)
            - (COALESCE(pay.total, 0) - COALESCE(ref.total, 0)),
          0
        ) > 0
  )                                           AS is_overdue
FROM "Invoice" i
LEFT JOIN LATERAL (
  SELECT SUM(p."amountMinor") AS total FROM "Payment" p WHERE p."invoiceId" = i.id
) pay ON TRUE
LEFT JOIN LATERAL (
  -- Only a completed refund moves money in the balance derivation.
  SELECT SUM(r."amountMinor") AS total FROM "Refund" r
  WHERE r."invoiceId" = i.id AND r.status = 'COMPLETED'
) ref ON TRUE
LEFT JOIN LATERAL (
  SELECT SUM(a."amountMinor") AS total FROM "FinancialAdjustment" a WHERE a."invoiceId" = i.id
) adj ON TRUE;

-- The installment counterpart. paidAmount, remaining and status are projected
-- here for the same reason: an installment's progress is its payments.
CREATE VIEW finance_installment_balance AS
SELECT
  ins.id                                      AS installment_id,
  ins."invoiceId"                             AS invoice_id,
  ins."planId"                                AS plan_id,
  ins.sequence                                AS sequence,
  ins."dueDate"                               AS due_date,
  ins."amountMinor"                           AS amount_minor,
  COALESCE(pay.total, 0)                      AS paid_minor,
  GREATEST(ins."amountMinor" - COALESCE(pay.total, 0), 0) AS remaining_minor,
  CASE
    WHEN COALESCE(pay.total, 0) >= ins."amountMinor" THEN 'PAID'::"FinanceInstallmentStatus"
    WHEN ins."dueDate" < CURRENT_DATE THEN 'OVERDUE'::"FinanceInstallmentStatus"
    WHEN COALESCE(pay.total, 0) > 0 THEN 'PARTIALLY_PAID'::"FinanceInstallmentStatus"
    ELSE 'PENDING'::"FinanceInstallmentStatus"
  END                                         AS derived_status
FROM "Installment" ins
LEFT JOIN LATERAL (
  SELECT SUM(p."amountMinor") AS total FROM "Payment" p WHERE p."installmentId" = ins.id
) pay ON TRUE;
