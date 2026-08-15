import { Injectable } from '@nestjs/common';
import {
  NegativeAmountException,
  PaymentExceedsBalanceException,
  InstallmentExceedsRemainingException,
  PaymentMethodInactiveException,
  FinanceValidationException,
  InvalidDateRangeException,
  InvoiceNotPayableException,
} from '../../../core/exceptions/student-finance.exceptions';

@Injectable()
export class PaymentPolicy {
  validatePositiveAmount(amount: bigint): void {
    if (amount <= 0n) {
      throw new NegativeAmountException();
    }
  }

  validatePaymentExceedsBalance(paymentAmount: bigint, remaining: bigint): void {
    if (paymentAmount > remaining) {
      throw new PaymentExceedsBalanceException(remaining.toString());
    }
  }

  validateMethodActivity(isActive: boolean): void {
    if (!isActive) {
      throw new PaymentMethodInactiveException();
    }
  }

  validateNonFutureDate(dateOnly: string): void {
    const today = new Date().toISOString().slice(0, 10);
    if (dateOnly > today) {
      throw new InvalidDateRangeException();
    }
  }

  validatePaymentDateNotBeforeIssueDate(
    paymentDate: string,
    issueDate: string,
  ): void {
    if (paymentDate < issueDate) {
      throw new InvalidDateRangeException();
    }
  }

  /**
   * A raw `Error` here would surface as a 500; the contract documents this as
   * a field validation failure.
   */
  validateNotes(notes: string | null | undefined): void {
    if (notes && notes.length > 500) {
      throw new FinanceValidationException([
        { field: 'notes', message: 'must not exceed 500 characters' },
      ]);
    }
  }

  validateInvoicePayable(invoiceStatus: string): void {
    const payableStatuses = ['ISSUED', 'PARTIALLY_PAID', 'PAID'];

    if (!payableStatuses.includes(invoiceStatus)) {
      throw new InvoiceNotPayableException(invoiceStatus);
    }
  }

  validateInstallmentRemaining(
    paymentAmount: bigint,
    installmentRemaining: bigint | null | undefined
  ): void {
    if (installmentRemaining !== null && installmentRemaining !== undefined) {
      if (paymentAmount > installmentRemaining) {
        throw new InstallmentExceedsRemainingException(installmentRemaining.toString());
      }
    }
  }

  validatePaymentMethodExists(methodId: string, availableMethods: string[]): void {
    if (!availableMethods.includes(methodId)) {
      throw new PaymentMethodInactiveException();
    }
  }
}
