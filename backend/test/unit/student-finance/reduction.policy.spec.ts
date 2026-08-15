import { describe, expect, it } from '@jest/globals';
import { ReductionPolicy } from '../../../src/modules/student-finance/reductions/reduction.policy';
import {
  DISCOUNT_MAX_SCALED,
  SCHOLARSHIP_MAX_SCALED,
} from '../../../src/modules/student-finance/lookups/finance-policy.config';

const policy = new ReductionPolicy();
const format = (minor: bigint) => minor.toString();

describe('ReductionPolicy', () => {
  describe('computeReductionAmount', () => {
    it('scales a percentage by 10000, not 100', () => {
      // 10% of 1000.00 (100000 minor) is 100.00 (10000 minor). A divisor of
      // 100 would return 100000 — the whole invoice.
      expect(
        policy.computeReductionAmount('PERCENTAGE', 10_00n, 100_000n),
      ).toBe(10_000n);
    });

    it('handles a fractional percentage exactly', () => {
      // 10.5% is stored as 1050; 10.5% of 100000 minor is 10500.
      expect(
        policy.computeReductionAmount('PERCENTAGE', 10_50n, 100_000n),
      ).toBe(10_500n);
    });

    it('passes a fixed amount through untouched', () => {
      expect(policy.computeReductionAmount('AMOUNT', 25_000n, 100_000n)).toBe(
        25_000n,
      );
    });

    it('truncates toward zero rather than producing a fraction of a minor unit', () => {
      // 33.33% of 1 minor unit is 0.003333 — must floor to 0, not round up.
      expect(policy.computeReductionAmount('PERCENTAGE', 33_33n, 1n)).toBe(0n);
    });

    it('a 100% reduction consumes exactly the base', () => {
      expect(
        policy.computeReductionAmount('PERCENTAGE', 100_00n, 87_654n),
      ).toBe(87_654n);
    });
  });

  describe('assertWithinPolicyLimit', () => {
    it('accepts a percentage at the discount cap', () => {
      expect(() =>
        policy.assertWithinPolicyLimit('PERCENTAGE', 50_00n, DISCOUNT_MAX_SCALED),
      ).not.toThrow();
    });

    it('rejects a percentage above the discount cap', () => {
      expect(() =>
        policy.assertWithinPolicyLimit('PERCENTAGE', 50_01n, DISCOUNT_MAX_SCALED),
      ).toThrow();
    });

    it('allows a scholarship up to full coverage', () => {
      expect(() =>
        policy.assertWithinPolicyLimit(
          'PERCENTAGE',
          100_00n,
          SCHOLARSHIP_MAX_SCALED,
        ),
      ).not.toThrow();
    });

    it('does not apply a percentage cap to a fixed amount', () => {
      expect(() =>
        policy.assertWithinPolicyLimit('AMOUNT', 999_999n, DISCOUNT_MAX_SCALED),
      ).not.toThrow();
    });
  });

  describe('assertNotBelowCollected', () => {
    it('refuses a reduction that would drop the final below what was collected', () => {
      expect(() =>
        policy.assertNotBelowCollected(400n, 500n, 'SAR', 2, format),
      ).toThrow();
    });

    it('allows a reduction that lands exactly on the collected amount', () => {
      expect(() =>
        policy.assertNotBelowCollected(500n, 500n, 'SAR', 2, format),
      ).not.toThrow();
    });

    it('allows any reduction when nothing has been collected', () => {
      expect(() =>
        policy.assertNotBelowCollected(0n, 0n, 'SAR', 2, format),
      ).not.toThrow();
    });
  });

  describe('computeFinalAmount', () => {
    it('subtracts both reduction kinds', () => {
      expect(policy.computeFinalAmount(100_000n, 10_000n, 5_000n)).toBe(85_000n);
    });

    it('floors at zero rather than inverting the invoice', () => {
      expect(policy.computeFinalAmount(10_000n, 8_000n, 8_000n)).toBe(0n);
    });
  });
});
