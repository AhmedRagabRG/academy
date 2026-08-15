import { describe, expect, it } from '@jest/globals';
import {
  toStoredCategory,
  toWireCategory,
} from '../../../src/modules/student-finance/statements/finance-timeline.service';
import type { FinanceEventCategory } from '../../../src/modules/student-finance/types/student-finance.types';

const ALL: FinanceEventCategory[] = [
  'invoice-created',
  'invoice-issued',
  'invoice-cancelled',
  'installment-plan-generated',
  'payment-received',
  'discount-applied',
  'scholarship-applied',
  'adjustment-recorded',
  'refund-requested',
  'refund-completed',
];

describe('finance timeline category mapping', () => {
  it.each(ALL)('round-trips %s through the stored enum', (category) => {
    expect(toWireCategory(toStoredCategory(category))).toBe(category);
  });

  it('maps to the SCREAMING_SNAKE spelling the database enum uses', () => {
    expect(toStoredCategory('installment-plan-generated')).toBe(
      'INSTALLMENT_PLAN_GENERATED',
    );
    expect(toStoredCategory('payment-received')).toBe('PAYMENT_RECEIVED');
  });

  it('covers every documented category', () => {
    // The contract lists exactly these ten; a new one must be added here too.
    expect(ALL).toHaveLength(10);
  });
});
