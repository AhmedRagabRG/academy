import { describe, expect, it } from '@jest/globals';
import {
  RefundLifecyclePolicy,
  type RefundStatus,
} from '../../../src/modules/student-finance/refunds/refund-lifecycle.policy';

const policy = new RefundLifecyclePolicy();

describe('RefundLifecyclePolicy', () => {
  describe('transition table', () => {
    it.each([
      ['REQUESTED', 'APPROVED'],
      ['REQUESTED', 'REJECTED'],
      ['REQUESTED', 'CANCELLED'],
      ['APPROVED', 'COMPLETED'],
      ['APPROVED', 'CANCELLED'],
    ] as [RefundStatus, RefundStatus][])('allows %s → %s', (from, to) => {
      expect(policy.isTransitionAllowed(from, to)).toBe(true);
    });

    it.each([
      ['REQUESTED', 'COMPLETED'],
      ['COMPLETED', 'CANCELLED'],
      ['REJECTED', 'APPROVED'],
      ['CANCELLED', 'REQUESTED'],
      ['APPROVED', 'REJECTED'],
    ] as [RefundStatus, RefundStatus][])('refuses %s → %s', (from, to) => {
      expect(policy.isTransitionAllowed(from, to)).toBe(false);
    });

    it('never completes without passing through approved', () => {
      expect(policy.isTransitionAllowed('REQUESTED', 'COMPLETED')).toBe(false);
    });
  });

  describe('terminal states', () => {
    it.each(['COMPLETED', 'REJECTED', 'CANCELLED'] as RefundStatus[])(
      '%s is terminal',
      (status) => {
        expect(policy.isTerminalStatus(status)).toBe(true);
      },
    );

    it.each(['REQUESTED', 'APPROVED'] as RefundStatus[])(
      '%s is not terminal',
      (status) => {
        expect(policy.isTerminalStatus(status)).toBe(false);
      },
    );
  });

  describe('reason requirements', () => {
    it('requires a reason to reject or cancel', () => {
      expect(policy.isReasonRequired('REJECTED')).toBe(true);
      expect(policy.isReasonRequired('CANCELLED')).toBe(true);
    });

    it('does not require a reason to approve or complete', () => {
      expect(policy.isReasonRequired('APPROVED')).toBe(false);
      expect(policy.isReasonRequired('COMPLETED')).toBe(false);
    });

    it('enforces a minimum reason length', () => {
      expect(policy.validateMinimumReasonLength('ab')).toBe(false);
      expect(policy.validateMinimumReasonLength('abc')).toBe(true);
    });
  });

  describe('computePaymentRefundable', () => {
    it('subtracts refunds already claimed against the payment', () => {
      expect(policy.computePaymentRefundable(1000n, 300n, 200n)).toBe(500n);
    });

    it('treats a fully claimed payment as having nothing refundable', () => {
      expect(policy.computePaymentRefundable(1000n, 1000n, 0n)).toBe(0n);
    });

    it('never reports a negative remainder', () => {
      expect(policy.computePaymentRefundable(1000n, 900n, 500n)).toBe(0n);
    });

    it('counts a pending request as reserved, so two requests cannot both pass', () => {
      // 600 already requested against a 1000 payment leaves 400, not 1000.
      expect(policy.computePaymentRefundable(1000n, 0n, 600n)).toBe(400n);
    });
  });
});
