import { Injectable } from '@nestjs/common';
import type { Money } from '../../../shared/types/money';
import { fromMinorUnits, toMinorUnits } from '../../../shared/utils/money.util';
import {
  InvalidCurrencyException,
  NegativeAmountException,
} from '../../../core/exceptions/student-finance.exceptions';
import type { ReductionKind } from '../types/student-finance.types';

/** Percentages are stored scaled by 100, so 10.5% is 1050 and 100% is 10000. */
export const PERCENT_SCALE = 10_000n;

/**
 * All finance arithmetic, in integer minor units. No float or Decimal touches
 * money anywhere in this module — a rounding artefact in a ledger is a defect,
 * not an approximation.
 */
@Injectable()
export class FinanceMoneyPolicy {
  /** Parses a decimal-string amount and refuses anything at or below zero. */
  toPositiveMinor(amount: string, currency: string, precision: number): bigint {
    const minor = toMinorUnits({ amount, currency, precision });
    if (minor <= 0n) throw new NegativeAmountException();
    return minor;
  }

  toMoney(minor: bigint, currency: string, precision: number): Money {
    return fromMinorUnits(minor, currency, precision);
  }

  /**
   * Combining values whose currency or precision disagree is refused rather
   * than silently coerced — a coerced total is wrong in a way nobody notices.
   */
  assertSameCurrency(...values: readonly Money[]): void {
    const [first, ...rest] = values;
    if (!first) return;
    for (const value of rest) {
      if (
        value.currency !== first.currency ||
        value.precision !== first.precision
      ) {
        throw new InvalidCurrencyException();
      }
    }
  }

  /**
   * Applies one reduction to a base amount. A percentage is scaled integer
   * arithmetic with truncation; a fixed amount is subtracted directly. The
   * result is clamped at zero so a reduction can never produce a negative
   * final amount.
   */
  reduce(baseMinor: bigint, kind: ReductionKind, value: bigint): bigint {
    const reduction =
      kind === 'percentage' ? (baseMinor * value) / PERCENT_SCALE : value;
    return reduction >= baseMinor ? 0n : baseMinor - reduction;
  }

  /** The reduction amount itself, for recording a FinancialAdjustment. */
  reductionAmount(
    baseMinor: bigint,
    kind: ReductionKind,
    value: bigint,
  ): bigint {
    const reduction =
      kind === 'percentage' ? (baseMinor * value) / PERCENT_SCALE : value;
    return reduction > baseMinor ? baseMinor : reduction;
  }

  /**
   * Splits a total into `count` parts that sum to it EXACTLY, with the
   * indivisible remainder on the final part. The invariant is structural: the
   * last element is defined as whatever is left, so no rounding drift is
   * possible regardless of total or count.
   */
  allocate(totalMinor: bigint, count: number): bigint[] {
    if (count < 1) throw new NegativeAmountException('count');
    const base = totalMinor / BigInt(count);
    const parts = Array.from({ length: count - 1 }, () => base);
    const allocated = base * BigInt(count - 1);
    parts.push(totalMinor - allocated);
    return parts;
  }

  /** Parses a percentage string ("10", "10.5") into its scaled integer form. */
  percentToScaled(value: string): bigint {
    return toMinorUnits({ amount: value, currency: 'PCT', precision: 2 });
  }

  scaledToPercent(value: bigint): string {
    return fromMinorUnits(value, 'PCT', 2).amount;
  }
}
