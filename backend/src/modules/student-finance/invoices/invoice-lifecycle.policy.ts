import { Injectable } from '@nestjs/common';
import {
  FinanceInvalidTransitionException,
  InvoiceHasPaymentsException,
  InvoiceImmutableException,
  InvoiceNotPayableException,
} from '../../../core/exceptions/student-finance.exceptions';
import type { InvoiceStatus } from '../types/student-finance.types';

/** Transitions a caller may request. `paid` and `partially-paid` are absent by design. */
export type InvoiceTransition = 'issued' | 'cancelled';

/**
 * The invoice lifecycle, evaluated against the DERIVED status rather than the
 * stored one.
 *
 * That distinction matters: an invoice with payments against it stores
 * `ISSUED` but presents as `partially-paid`, and a fully settled one stores
 * `ISSUED` but presents as `paid` and must be terminal. Deciding transitions
 * from the stored column would let a fully paid invoice be cancelled.
 */
@Injectable()
export class InvoiceLifecyclePolicy {
  private static readonly ALLOWED: Record<
    InvoiceStatus,
    readonly InvoiceTransition[]
  > = {
    draft: ['issued', 'cancelled'],
    issued: ['cancelled'],
    'partially-paid': ['cancelled'],
    paid: [],
    cancelled: [],
  };

  /** Draft figures are editable only while the invoice is a draft. */
  isEditable(status: InvoiceStatus): boolean {
    return status === 'draft';
  }

  assertEditable(status: InvoiceStatus): void {
    if (!this.isEditable(status)) {
      throw new InvoiceImmutableException(status, [
        ...InvoiceLifecyclePolicy.ALLOWED[status],
      ]);
    }
  }

  allowedFrom(status: InvoiceStatus): readonly InvoiceTransition[] {
    return InvoiceLifecyclePolicy.ALLOWED[status];
  }

  assertCanIssue(status: InvoiceStatus): void {
    if (!this.allowedFrom(status).includes('issued')) {
      throw new FinanceInvalidTransitionException(status, [
        ...this.allowedFrom(status),
      ]);
    }
  }

  /**
   * Cancellation is the only reversal an invoice has, so it is refused once
   * money has been collected against it — that correction is a refund, which
   * keeps the payment record intact.
   */
  assertCanCancel(
    status: InvoiceStatus,
    collectedMinor: bigint,
    collectedAmount: string,
  ): void {
    if (!this.allowedFrom(status).includes('cancelled')) {
      throw new FinanceInvalidTransitionException(status, [
        ...this.allowedFrom(status),
      ]);
    }
    if (collectedMinor > 0n) {
      throw new InvoiceHasPaymentsException(collectedAmount);
    }
  }

  /** Money may only be recorded against an invoice that is issued or part-paid. */
  assertPayable(status: InvoiceStatus): void {
    if (status !== 'issued' && status !== 'partially-paid') {
      throw new InvoiceNotPayableException(status);
    }
  }

  /** Plans attach to a real charge, so a draft or cancelled invoice has none. */
  assertPlannable(status: InvoiceStatus): void {
    if (status === 'draft' || status === 'cancelled') {
      throw new InvoiceNotPayableException(status);
    }
  }
}
