import { Injectable } from '@nestjs/common';
import { InvalidDateRangeException } from '../../../core/exceptions/student-finance.exceptions';
import { FinanceMoneyPolicy } from '../balances/finance-money.policy';
import type { ReductionKind } from '../types/student-finance.types';

export interface ReductionInput {
  kind: ReductionKind;
  /** Decimal string: "0..100" for a percentage, otherwise an amount. */
  value: string;
}

export interface DraftFigureInput {
  totalMinor: bigint;
  discount?: ReductionInput;
  scholarship?: ReductionInput;
  currency: string;
  precision: number;
}

export interface DraftFigureResult {
  totalMinor: bigint;
  discountTotalMinor: bigint;
  scholarshipTotalMinor: bigint;
  finalMinor: bigint;
}

/**
 * Recomputes a draft invoice's four figures from its total and the reductions
 * attached to it.
 *
 * `finalAmount` is always produced here and never accepted from a client — the
 * whole point of a reduction policy is that the client cannot assert a final
 * amount the rules do not support.
 */
@Injectable()
export class InvoiceDraftPolicy {
  constructor(private readonly money: FinanceMoneyPolicy) {}

  compute(input: DraftFigureInput): DraftFigureResult {
    const { totalMinor } = input;

    // Discount applies to the total; the scholarship then applies to what is
    // left. Applying both to the original total could reduce below zero and
    // would let two 60% reductions erase a 120% charge.
    const discountTotalMinor = input.discount
      ? this.money.reductionAmount(
          totalMinor,
          input.discount.kind,
          this.parse(input.discount, input.currency, input.precision),
        )
      : 0n;

    const afterDiscount = totalMinor - discountTotalMinor;

    const scholarshipTotalMinor = input.scholarship
      ? this.money.reductionAmount(
          afterDiscount,
          input.scholarship.kind,
          this.parse(input.scholarship, input.currency, input.precision),
        )
      : 0n;

    return {
      totalMinor,
      discountTotalMinor,
      scholarshipTotalMinor,
      finalMinor: afterDiscount - scholarshipTotalMinor,
    };
  }

  /**
   * A due date defaults to the organization's configured window when the
   * caller does not supply one, so an invoice can never be raised without a
   * date to become overdue against.
   */
  resolveDueDate(
    supplied: string | undefined,
    issuedOn: Date,
    defaultDueDays: number,
  ): string {
    if (supplied) return supplied;
    const due = new Date(issuedOn);
    due.setUTCDate(due.getUTCDate() + defaultDueDays);
    return due.toISOString().slice(0, 10);
  }

  /** A due date before the issue date would be overdue the moment it existed. */
  assertDueAfterIssue(dueDate: string, issueDate: string | null): void {
    if (issueDate && dueDate < issueDate) {
      throw new InvalidDateRangeException(
        'لا يمكن أن يسبق تاريخ الاستحقاق تاريخ إصدار الفاتورة',
      );
    }
  }

  private parse(
    reduction: ReductionInput,
    currency: string,
    precision: number,
  ): bigint {
    return reduction.kind === 'percentage'
      ? this.money.percentToScaled(reduction.value)
      : this.money.toPositiveMinor(reduction.value, currency, precision);
  }
}
