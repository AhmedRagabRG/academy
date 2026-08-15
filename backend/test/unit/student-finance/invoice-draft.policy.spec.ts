import { FinanceMoneyPolicy } from '../../../src/modules/student-finance/balances/finance-money.policy';
import { InvoiceDraftPolicy } from '../../../src/modules/student-finance/invoices/invoice-draft.policy';

describe('InvoiceDraftPolicy', () => {
  const money = new FinanceMoneyPolicy();
  const policy = new InvoiceDraftPolicy(money);
  const base = { currency: 'EGP', precision: 2 };

  describe('figure recomputation', () => {
    it('leaves the total intact when there is no reduction', () => {
      expect(policy.compute({ ...base, totalMinor: 1_800_000n })).toEqual({
        totalMinor: 1_800_000n,
        discountTotalMinor: 0n,
        scholarshipTotalMinor: 0n,
        finalMinor: 1_800_000n,
      });
    });

    it('applies a percentage discount in integer minor units', () => {
      const result = policy.compute({
        ...base,
        totalMinor: 1_800_000n,
        discount: { kind: 'percentage', value: '10' },
      });
      expect(result.discountTotalMinor).toBe(180_000n);
      expect(result.finalMinor).toBe(1_620_000n);
    });

    it('applies a fixed discount', () => {
      const result = policy.compute({
        ...base,
        totalMinor: 1_800_000n,
        discount: { kind: 'amount', value: '500.00' },
      });
      expect(result.discountTotalMinor).toBe(50_000n);
      expect(result.finalMinor).toBe(1_750_000n);
    });

    it('applies the scholarship to what remains after the discount', () => {
      // Applying both to the original total would let two 60% reductions
      // erase 120% of the charge.
      const result = policy.compute({
        ...base,
        totalMinor: 1_000_000n,
        discount: { kind: 'percentage', value: '60' },
        scholarship: { kind: 'percentage', value: '60' },
      });
      expect(result.discountTotalMinor).toBe(600_000n);
      expect(result.scholarshipTotalMinor).toBe(240_000n);
      expect(result.finalMinor).toBe(160_000n);
      expect(result.finalMinor).toBeGreaterThanOrEqual(0n);
    });

    it('never produces a negative final amount', () => {
      const result = policy.compute({
        ...base,
        totalMinor: 100_000n,
        discount: { kind: 'amount', value: '99999.00' },
      });
      expect(result.finalMinor).toBe(0n);
      expect(result.discountTotalMinor).toBe(100_000n);
    });

    it('handles a fractional percentage without drifting', () => {
      const result = policy.compute({
        ...base,
        totalMinor: 1_000_000n,
        discount: { kind: 'percentage', value: '12.5' },
      });
      expect(result.discountTotalMinor).toBe(125_000n);
      expect(result.finalMinor).toBe(875_000n);
    });

    it('keeps the four figures internally consistent', () => {
      const result = policy.compute({
        ...base,
        totalMinor: 1_800_000n,
        discount: { kind: 'percentage', value: '10' },
        scholarship: { kind: 'amount', value: '1000.00' },
      });
      expect(
        result.totalMinor -
          result.discountTotalMinor -
          result.scholarshipTotalMinor,
      ).toBe(result.finalMinor);
    });
  });

  describe('due dates', () => {
    it('defaults from the configured window when none is supplied', () => {
      expect(
        policy.resolveDueDate(undefined, new Date('2026-07-25T00:00:00Z'), 30),
      ).toBe('2026-08-24');
    });

    it('prefers an explicit due date', () => {
      expect(
        policy.resolveDueDate(
          '2026-09-01',
          new Date('2026-07-25T00:00:00Z'),
          30,
        ),
      ).toBe('2026-09-01');
    });

    it('crosses a month and year boundary correctly', () => {
      expect(
        policy.resolveDueDate(undefined, new Date('2026-12-20T00:00:00Z'), 30),
      ).toBe('2027-01-19');
    });

    it('refuses a due date that precedes the issue date', () => {
      expect(() =>
        policy.assertDueAfterIssue('2026-07-01', '2026-07-25'),
      ).toThrow(expect.objectContaining({ code: 'invalid-date-range' }));
      expect(() =>
        policy.assertDueAfterIssue('2026-08-24', '2026-07-25'),
      ).not.toThrow();
      // A draft has no issue date yet, so there is nothing to precede.
      expect(() =>
        policy.assertDueAfterIssue('2020-01-01', null),
      ).not.toThrow();
    });
  });
});
