import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const migration = readFileSync(
  join(
    process.cwd(),
    'prisma/migrations/20260804030000_student_finance/migration.sql',
  ),
  'utf8',
);

describe('Student Finance migration', () => {
  it.each([
    'StudentFinancialAccount',
    'StudentEnrollmentFinancialSnapshot',
    'Invoice',
    'InvoiceStatusChange',
    'InstallmentPlan',
    'Installment',
    'Payment',
    'Discount',
    'Scholarship',
    'FinancialAdjustment',
    'Refund',
    'FinanceTimelineEvent',
    'FinanceNumberCounter',
  ])('creates %s', (table) => {
    expect(migration).toContain(`CREATE TABLE "${table}"`);
  });

  it.each([
    'FinanceOfferingKind',
    'FinanceInvoiceStatus',
    'FinanceInstallmentStatus',
    'FinanceRefundStatus',
    'FinanceReductionKind',
    'FinanceScholarshipCoverage',
    'FinanceScheduleBasis',
    'FinanceReductionSourceKind',
    'FinanceEventCategory',
    'FinanceSequenceKind',
  ])('creates the %s enum', (enumName) => {
    expect(migration).toContain(`CREATE TYPE "${enumName}"`);
  });

  it('makes invoice raising idempotent in the database, not by an application check', () => {
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "Invoice_enrollmentId_chargePurposeValueId_key"',
    );
  });

  it('enforces one financial account and one financial snapshot per subject', () => {
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "StudentFinancialAccount_studentId_key"',
    );
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "StudentEnrollmentFinancialSnapshot_enrollmentId_key"',
    );
  });

  it('reserves document numbers uniquely per organization', () => {
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "Invoice_organizationId_invoiceNumber_key"',
    );
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "Payment_organizationId_receiptNumber_key"',
    );
  });

  it('keeps the derived statuses out of the stored invoice column', () => {
    // partially-paid and paid are consequences of recorded money. Restricting
    // the stored column is what makes "never settable" structural.
    expect(migration).toContain('Invoice_stored_status_not_derived');
    expect(migration).toContain("'DRAFT', 'ISSUED', 'CANCELLED'");
  });

  it('requires complete, dated issued snapshots and reasoned cancellations', () => {
    expect(migration).toContain('Invoice_issued_snapshot_complete');
    expect(migration).toContain('Invoice_issued_requires_date');
    expect(migration).toContain('Invoice_cancel_requires_reason');
  });

  it('bounds money, percentages, notes and reasons at the database', () => {
    expect(migration).toContain('Invoice_amounts_non_negative');
    expect(migration).toContain('Payment_amount_positive');
    expect(migration).toContain('Payment_notes_bounded');
    expect(migration).toContain('Installment_amount_positive');
    expect(migration).toContain('Discount_value_bounded');
    expect(migration).toContain('Scholarship_value_bounded');
    expect(migration).toContain('Scholarship_name_present');
    expect(migration).toContain('FinancialAdjustment_amount_positive');
    expect(migration).toContain('Refund_amount_positive');
    expect(migration).toContain('Refund_decision_reason');
    expect(migration).toContain('Refund_completed_time');
  });

  it('creates both balance views and stores no balance column', () => {
    expect(migration).toContain('CREATE VIEW finance_invoice_balance');
    expect(migration).toContain('CREATE VIEW finance_installment_balance');
    // A view holds no rows, so it cannot drift from the records that produce
    // it. Any of these as a column would be a second source of truth.
    expect(migration).not.toMatch(/"remainingMinor"\s+BIGINT/);
    expect(migration).not.toMatch(/"netPaidMinor"\s+BIGINT/);
    expect(migration).not.toMatch(/"collectedMinor"\s+BIGINT/);
    expect(migration).not.toMatch(/"outstandingBalanceMinor"\s+BIGINT/);
    expect(migration).not.toMatch(/"paidAmountMinor"\s+BIGINT/);
  });

  it('counts only completed refunds toward the balance derivation', () => {
    expect(migration).toMatch(
      /FROM "Refund" r\s+WHERE r\."invoiceId" = i\.id AND r\.status = 'COMPLETED'/,
    );
  });

  it('derives overdue rather than storing it', () => {
    expect(migration).toContain('AS is_overdue');
    expect(migration).toContain('"dueDate" < CURRENT_DATE');
    // No OVERDUE member on the invoice status enum.
    expect(migration).toContain(
      `CREATE TYPE "FinanceInvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED')`,
    );
  });
});
