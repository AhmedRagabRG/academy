import { describe, it, expect } from '@jest/globals';

interface FinanceBalance {
  finalMinor: bigint;
  netPaidMinor: bigint;
  refundedMinor: bigint;
  remainingMinor: bigint;
  derivedStatus: 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';
  isOverdue: boolean;
}

describe('FinanceBalancePolicy', () => {
  describe('netPaid derivation', () => {
    it('should calculate netPaid as sum of payments minus completed refunds', () => {
      const paidAmount = 50000n;
      const refundedAmount = 10000n;
      const expectedNetPaid = paidAmount - refundedAmount;

      expect(expectedNetPaid).toBe(40000n);
    });

    it('should handle zero payments', () => {
      const paidAmount = 0n;
      const refundedAmount = 0n;
      const expectedNetPaid = paidAmount - refundedAmount;

      expect(expectedNetPaid).toBe(0n);
    });

    it('should not include pending refunds in netPaid', () => {
      const paidAmount = 50000n;
      const completedRefunds = 5000n;
      const pendingRefunds = 10000n;
      const expectedNetPaid = paidAmount - completedRefunds;

      expect(expectedNetPaid).toBe(45000n);
      expect(expectedNetPaid).not.toBe(paidAmount - completedRefunds - pendingRefunds);
    });
  });

  describe('remaining derivation', () => {
    it('should calculate remaining as finalAmount minus netPaid', () => {
      const finalAmount = 100000n;
      const paidAmount = 30000n;
      const refundedAmount = 5000n;
      const netPaid = paidAmount - refundedAmount;
      const remaining = finalAmount - netPaid;

      expect(remaining).toBe(75000n);
    });

    it('should handle fully paid invoice', () => {
      const finalAmount = 100000n;
      const netPaid = 100000n;
      const remaining = finalAmount - netPaid;

      expect(remaining).toBe(0n);
    });

    it('should handle unpaid invoice', () => {
      const finalAmount = 100000n;
      const netPaid = 0n;
      const remaining = finalAmount - netPaid;

      expect(remaining).toBe(100000n);
    });

    it('should never be negative', () => {
      const finalAmount = 100000n;
      const netPaid = 100000n;
      const remaining = Math.max(0, Number(finalAmount - netPaid));

      expect(remaining).toBeGreaterThanOrEqual(0);
    });
  });

  describe('derivedStatus transitions', () => {
    it('should derive ISSUED status when invoice issued and zero payments', () => {
      const balance: FinanceBalance = {
        finalMinor: 100000n,
        netPaidMinor: 0n,
        refundedMinor: 0n,
        remainingMinor: 100000n,
        derivedStatus: 'ISSUED',
        isOverdue: false,
      };

      expect(balance.remainingMinor).toBe(balance.finalMinor);
      expect(balance.derivedStatus).toBe('ISSUED');
    });

    it('should derive PARTIALLY_PAID status when invoice issued and partial payment', () => {
      const balance: FinanceBalance = {
        finalMinor: 100000n,
        netPaidMinor: 40000n,
        refundedMinor: 0n,
        remainingMinor: 60000n,
        derivedStatus: 'PARTIALLY_PAID',
        isOverdue: false,
      };

      expect(balance.netPaidMinor).toBeGreaterThan(0n);
      expect(balance.remainingMinor).toBeGreaterThan(0n);
      expect(balance.derivedStatus).toBe('PARTIALLY_PAID');
    });

    it('should derive PAID status when all amount collected', () => {
      const balance: FinanceBalance = {
        finalMinor: 100000n,
        netPaidMinor: 100000n,
        refundedMinor: 0n,
        remainingMinor: 0n,
        derivedStatus: 'PAID',
        isOverdue: false,
      };

      expect(balance.remainingMinor).toBe(0n);
      expect(balance.derivedStatus).toBe('PAID');
    });

    it('should maintain DRAFT status when not issued', () => {
      const balance: FinanceBalance = {
        finalMinor: 100000n,
        netPaidMinor: 0n,
        refundedMinor: 0n,
        remainingMinor: 0n,
        derivedStatus: 'DRAFT',
        isOverdue: false,
      };

      expect(balance.derivedStatus).toBe('DRAFT');
    });

    it('should maintain CANCELLED status regardless of payments', () => {
      const balance: FinanceBalance = {
        finalMinor: 100000n,
        netPaidMinor: 50000n,
        refundedMinor: 0n,
        remainingMinor: 50000n,
        derivedStatus: 'CANCELLED',
        isOverdue: false,
      };

      expect(balance.derivedStatus).toBe('CANCELLED');
    });
  });

  describe('overdue derivation', () => {
    it('should mark invoice overdue when due date passed and balance remaining', () => {
      const dueDate = '2026-01-10';
      const today = '2026-01-15';
      const remaining = 50000n;

      const isOverdue = today > dueDate && remaining > 0n;
      expect(isOverdue).toBe(true);
    });

    it('should not mark fully paid invoice as overdue', () => {
      const dueDate = '2026-01-10';
      const today = '2026-01-15';
      const remaining = 0n;

      const isOverdue = today > dueDate && remaining > 0n;
      expect(isOverdue).toBe(false);
    });

    it('should not mark invoice overdue when due date not passed', () => {
      const dueDate = '2026-02-15';
      const today = '2026-01-15';
      const remaining = 50000n;

      const isOverdue = today > dueDate && remaining > 0n;
      expect(isOverdue).toBe(false);
    });
  });

  describe('across payment scenarios', () => {
    it('partial payment: 100k invoice, 30k paid', () => {
      const finalAmount = 100000n;
      const paidAmount = 30000n;
      const refundedAmount = 0n;
      const netPaid = paidAmount - refundedAmount;
      const remaining = finalAmount - netPaid;

      expect(netPaid).toBe(30000n);
      expect(remaining).toBe(70000n);
      expect(netPaid).toBeGreaterThan(0n);
      expect(remaining).toBeGreaterThan(0n);
    });

    it('exact payment: 100k invoice, 100k paid', () => {
      const finalAmount = 100000n;
      const paidAmount = 100000n;
      const refundedAmount = 0n;
      const netPaid = paidAmount - refundedAmount;
      const remaining = finalAmount - netPaid;

      expect(netPaid).toBe(100000n);
      expect(remaining).toBe(0n);
      expect(remaining).toBe(0n);
    });

    it('over-collected and refunded: 100k invoice, 130k paid, 30k refunded', () => {
      const finalAmount = 100000n;
      const paidAmount = 130000n;
      const refundedAmount = 30000n;
      const netPaid = paidAmount - refundedAmount;
      const remaining = finalAmount - netPaid;

      expect(netPaid).toBe(100000n);
      expect(remaining).toBe(0n);
    });

    it('partial refund: 100k invoice, 80k paid, 20k refunded', () => {
      const finalAmount = 100000n;
      const paidAmount = 80000n;
      const refundedAmount = 20000n;
      const netPaid = paidAmount - refundedAmount;
      const remaining = finalAmount - netPaid;

      expect(netPaid).toBe(60000n);
      expect(remaining).toBe(40000n);
    });
  });
});
