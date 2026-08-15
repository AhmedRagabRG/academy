import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const migration = readFileSync(
  join(
    process.cwd(),
    'prisma/migrations/20260804030000_student_finance/migration.sql',
  ),
  'utf8',
);

/**
 * Immutable financial history is the module's core audit guarantee, so it is
 * enforced by the database rather than by review. A future migration, repair
 * script or repository refactor must not be able to rewrite settled money.
 */
describe('Student Finance immutability', () => {
  it('defines the append-only rejection function', () => {
    expect(migration).toContain(
      'CREATE FUNCTION finance_reject_history_mutation()',
    );
    expect(migration).toContain("RAISE EXCEPTION '% is append-only'");
  });

  it.each([
    'Payment',
    'InvoiceStatusChange',
    'Discount',
    'Scholarship',
    'FinancialAdjustment',
    'FinanceTimelineEvent',
    'StudentEnrollmentFinancialSnapshot',
  ])('rejects UPDATE and DELETE on %s', (table) => {
    expect(migration).toContain(
      `CREATE TRIGGER "${table}_append_only" BEFORE UPDATE OR DELETE ON "${table}"`,
    );
  });

  it('writes the issued snapshot exactly once', () => {
    expect(migration).toContain(
      'CREATE FUNCTION finance_reject_issued_snapshot_rewrite()',
    );
    expect(migration).toContain('Invoice_issued_snapshot_write_once');
    expect(migration).toContain(
      "RAISE EXCEPTION 'issued snapshot is write-once and cannot be modified'",
    );
  });

  it('permits draft figure edits only while the invoice is a draft', () => {
    expect(migration).toContain(
      'CREATE FUNCTION finance_reject_non_draft_figure_edit()',
    );
    expect(migration).toContain('Invoice_draft_figures_draft_only');
  });

  it('fixes invoice identity and currency at raise time', () => {
    expect(migration).toContain(
      'CREATE FUNCTION finance_reject_invoice_identity_change()',
    );
    expect(migration).toContain('Invoice_identity_immutable');
  });

  it('never grants a cascade delete on a money-bearing table', () => {
    // Installment cascades from its plan because regenerating a payment-free
    // plan replaces it. Nothing that carries money may cascade.
    for (const clause of [
      'ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey"',
      'ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paymentId_fkey"',
      'ALTER TABLE "Discount" ADD CONSTRAINT "Discount_invoiceId_fkey"',
      'ALTER TABLE "FinancialAdjustment" ADD CONSTRAINT "FinancialAdjustment_invoiceId_fkey"',
    ]) {
      const line = migration
        .split('\n')
        .find((candidate) => candidate.startsWith(clause));
      expect(line).toBeDefined();
      expect(line).toContain('ON DELETE RESTRICT');
    }
  });
});
