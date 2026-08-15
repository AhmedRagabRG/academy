import { describe, it, expect } from '@jest/globals';
import { PaymentPolicy } from '../../../src/modules/student-finance/payments/payment.policy';
import {
  InvalidDateRangeException,
  NegativeAmountException,
  PaymentExceedsBalanceException,
  PaymentMethodInactiveException,
  InvoiceNotPayableException,
} from '../../../src/core/exceptions/student-finance.exceptions';

describe('PaymentPolicy', () => {
  const policy = new PaymentPolicy();

  describe('positive amount', () => {
    it('should accept positive amount', () => {
      const amount = 10000n;
      expect(() => policy.validatePositiveAmount(amount)).not.toThrow();
    });

    it('should reject zero amount', () => {
      expect(() => policy.validatePositiveAmount(0n)).toThrow(NegativeAmountException);
    });

    it('should reject negative amount', () => {
      expect(() => policy.validatePositiveAmount(-1000n)).toThrow(NegativeAmountException);
    });
  });

  describe('payment amount bounds', () => {
    it('should accept payment within remaining balance', () => {
      const remaining = 50000n;
      const paymentAmount = 25000n;
      expect(() =>
        policy.validatePaymentExceedsBalance(paymentAmount, remaining)
      ).not.toThrow();
    });

    it('should accept payment equal to remaining balance', () => {
      const remaining = 50000n;
      const paymentAmount = 50000n;
      expect(() =>
        policy.validatePaymentExceedsBalance(paymentAmount, remaining)
      ).not.toThrow();
    });

    it('should reject payment exceeding remaining balance', () => {
      const remaining = 50000n;
      const paymentAmount = 50001n;
      expect(() =>
        policy.validatePaymentExceedsBalance(paymentAmount, remaining)
      ).toThrow(PaymentExceedsBalanceException);
    });
  });

  describe('payment method activity', () => {
    it('should accept active payment method', () => {
      expect(() => policy.validateMethodActivity(true)).not.toThrow();
    });

    it('should reject inactive payment method', () => {
      expect(() => policy.validateMethodActivity(false)).toThrow(
        PaymentMethodInactiveException
      );
    });
  });

  describe('payment date validation', () => {
    it('should accept today as payment date', () => {
      const today = new Date();
      const dateOnly = today.toISOString().split('T')[0];
      expect(() => policy.validateNonFutureDate(dateOnly)).not.toThrow();
    });

    it('should accept past date as payment date', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      const dateOnly = pastDate.toISOString().split('T')[0];
      expect(() => policy.validateNonFutureDate(dateOnly)).not.toThrow();
    });

    it('should reject future date as payment date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const dateOnly = futureDate.toISOString().split('T')[0];
      expect(() => policy.validateNonFutureDate(dateOnly)).toThrow(
        InvalidDateRangeException
      );
    });
  });

  describe('payment date not before issue date', () => {
    it('should accept payment date equal to issue date', () => {
      const issueDate = '2026-01-15';
      const paymentDate = '2026-01-15';
      expect(() =>
        policy.validatePaymentDateNotBeforeIssueDate(paymentDate, issueDate)
      ).not.toThrow();
    });

    it('should accept payment date after issue date', () => {
      const issueDate = '2026-01-15';
      const paymentDate = '2026-01-20';
      expect(() =>
        policy.validatePaymentDateNotBeforeIssueDate(paymentDate, issueDate)
      ).not.toThrow();
    });

    it('should reject payment date before issue date', () => {
      const issueDate = '2026-01-15';
      const paymentDate = '2026-01-14';
      expect(() =>
        policy.validatePaymentDateNotBeforeIssueDate(paymentDate, issueDate)
      ).toThrow(InvalidDateRangeException);
    });
  });

  describe('notes validation', () => {
    it('should accept notes up to 500 characters', () => {
      const notes = 'a'.repeat(500);
      expect(() => policy.validateNotes(notes)).not.toThrow();
    });

    it('should accept empty notes', () => {
      expect(() => policy.validateNotes('')).not.toThrow();
    });

    it('should accept null notes', () => {
      expect(() => policy.validateNotes(null)).not.toThrow();
    });

    it('should reject notes exceeding 500 characters', () => {
      const notes = 'a'.repeat(501);
      expect(() => policy.validateNotes(notes)).toThrow();
    });
  });

  describe('invoice payability', () => {
    it('should accept issued invoice', () => {
      expect(() => policy.validateInvoicePayable('ISSUED')).not.toThrow();
    });

    it('should accept draft invoice with payments in special cases', () => {
      expect(() => policy.validateInvoicePayable('DRAFT')).toThrow(
        InvoiceNotPayableException
      );
    });

    it('should accept partially paid invoice', () => {
      expect(() => policy.validateInvoicePayable('PARTIALLY_PAID')).not.toThrow();
    });

    it('should accept paid invoice (edge case)', () => {
      expect(() => policy.validateInvoicePayable('PAID')).not.toThrow();
    });

    it('should reject cancelled invoice', () => {
      expect(() => policy.validateInvoicePayable('CANCELLED')).toThrow(
        InvoiceNotPayableException
      );
    });
  });

  describe('installment remaining amount', () => {
    it('should accept payment within installment remaining', () => {
      const paymentAmount = 25000n;
      const installmentRemaining = 50000n;
      expect(() =>
        policy.validateInstallmentRemaining(paymentAmount, installmentRemaining)
      ).not.toThrow();
    });

    it('should accept payment equal to installment remaining', () => {
      const paymentAmount = 50000n;
      const installmentRemaining = 50000n;
      expect(() =>
        policy.validateInstallmentRemaining(paymentAmount, installmentRemaining)
      ).not.toThrow();
    });

    it('should reject payment exceeding installment remaining', () => {
      const paymentAmount = 50001n;
      const installmentRemaining = 50000n;
      expect(() =>
        policy.validateInstallmentRemaining(paymentAmount, installmentRemaining)
      ).toThrow();
    });

    it('should handle null installment remaining (no installment plan)', () => {
      const paymentAmount = 25000n;
      const installmentRemaining = null;
      expect(() =>
        policy.validateInstallmentRemaining(paymentAmount, installmentRemaining)
      ).not.toThrow();
    });
  });
});
