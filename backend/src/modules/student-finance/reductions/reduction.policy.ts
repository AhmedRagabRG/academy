import { Injectable } from '@nestjs/common';
import type { FinanceReductionKind } from '../../../../prisma/generated/client';
import {
  ReductionBelowCollectedException,
  ReductionExceedsLimitException,
} from '../../../core/exceptions/student-finance.exceptions';

/**
 * Percentage values are stored as percentage points scaled by 100, so 10.5%
 * is 1050. Dividing by 100 would therefore inflate every percentage reduction
 * a hundredfold — the scale factor is 10000.
 */
const PERCENT_SCALE = 10_000n;

@Injectable()
export class ReductionPolicy {
  /**
   * Integer-only. A percentage reduction truncates toward zero, which favours
   * the ledger over the reduction and keeps the result an exact minor unit.
   */
  computeReductionAmount(
    kind: FinanceReductionKind,
    value: bigint,
    baseMinor: bigint,
  ): bigint {
    return kind === 'PERCENTAGE'
      ? (baseMinor * value) / PERCENT_SCALE
      : value;
  }

  /**
   * `maxPercentage` is expressed in the same scaled points as `value`, so the
   * comparison is exact and never converts through a float.
   */
  assertWithinPolicyLimit(
    kind: FinanceReductionKind,
    value: bigint,
    maxScaledPercentage: bigint,
  ): void {
    if (kind !== 'PERCENTAGE') return;
    if (value > maxScaledPercentage) {
      throw new ReductionExceedsLimitException(
        this.formatScaledPercentage(maxScaledPercentage),
      );
    }
  }

  /**
   * A reduction may not push the invoice's final amount below what has already
   * been collected — that would imply refunding money the reduction never
   * touched, and would make the remaining balance negative.
   */
  assertNotBelowCollected(
    newFinalMinor: bigint,
    collectedMinor: bigint,
    currency: string,
    precision: number,
    format: (minor: bigint, currency: string, precision: number) => string,
  ): void {
    if (newFinalMinor < collectedMinor) {
      throw new ReductionBelowCollectedException(
        format(collectedMinor, currency, precision),
      );
    }
  }

  /** Never negative: a reduction can zero an invoice but not invert it. */
  computeFinalAmount(
    totalMinor: bigint,
    discountTotalMinor: bigint,
    scholarshipTotalMinor: bigint,
  ): bigint {
    const result = totalMinor - discountTotalMinor - scholarshipTotalMinor;
    return result > 0n ? result : 0n;
  }

  private formatScaledPercentage(scaled: bigint): string {
    const whole = scaled / 100n;
    const fraction = scaled % 100n;
    return fraction === 0n
      ? `${whole}`
      : `${whole}.${fraction.toString().padStart(2, '0')}`;
  }
}
