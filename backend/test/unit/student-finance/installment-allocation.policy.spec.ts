import { describe, expect, it } from '@jest/globals';
import { InstallmentAllocationPolicy } from '../../../src/modules/student-finance/installments/installment-allocation.policy';

const policy = new InstallmentAllocationPolicy();

describe('InstallmentAllocationPolicy', () => {
  describe('allocate', () => {
    it('divides evenly when the total is divisible', () => {
      const { installments } = policy.allocate(120_000n, 4);
      expect(installments).toEqual([30_000n, 30_000n, 30_000n, 30_000n]);
    });

    it('places the whole remainder on the final installment', () => {
      // 100.01 over 3 parts: 33.33, 33.33, 33.35
      const { installments } = policy.allocate(10_001n, 3);
      expect(installments).toEqual([3_333n, 3_333n, 3_335n]);
    });

    it('sums to the total exactly for every count from 1 to 12', () => {
      const total = 999_999n;
      for (let count = 1; count <= 12; count += 1) {
        const { installments } = policy.allocate(total, count);
        expect(installments).toHaveLength(count);
        expect(installments.reduce((a, b) => a + b, 0n)).toBe(total);
      }
    });

    it('returns the whole total as a single installment', () => {
      expect(policy.allocate(50_000n, 1).installments).toEqual([50_000n]);
    });

    it('refuses a non-positive count', () => {
      expect(() => policy.allocate(1_000n, 0)).toThrow();
    });

    it('refuses a non-positive total', () => {
      expect(() => policy.allocate(0n, 3)).toThrow();
    });
  });

  describe('validateAllocation', () => {
    it('accepts parts that sum to the expected total', () => {
      expect(policy.validateAllocation([100n, 100n, 101n], 301n)).toBe(true);
    });

    it('rejects parts that do not', () => {
      expect(policy.validateAllocation([100n, 100n, 100n], 301n)).toBe(false);
    });
  });
});
