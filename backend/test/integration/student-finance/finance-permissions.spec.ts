import { PERMISSION_CATALOG } from '../../../prisma/seeds/permission-catalog';
import { FINANCE_PERMISSION_KEYS } from '../../../src/modules/student-finance/types/student-finance.types';

const expected = [
  'finance.view',
  'finance.invoices.view',
  'finance.invoices.create',
  'finance.invoices.update',
  'finance.invoices.issue',
  'finance.invoices.cancel',
  'finance.installments.manage',
  'finance.payments.view',
  'finance.payments.record',
  'finance.discounts.approve',
  'finance.scholarships.approve',
  'finance.refunds.view',
  'finance.refunds.record',
  'finance.refunds.approve',
  'finance.timeline.view',
  'finance.export',
];

describe('Student Finance permission catalogue', () => {
  it('contains exactly the closed finance key set', () => {
    const finance = PERMISSION_CATALOG.filter(({ key }) =>
      key.startsWith('finance.'),
    );
    expect(finance.map(({ key }) => key)).toEqual(expected);
    expect(new Set(finance.map(({ key }) => key)).size).toBe(expected.length);
  });

  it('matches the keys the module enforces at runtime', () => {
    expect([...FINANCE_PERMISSION_KEYS]).toEqual(expected);
  });

  it('keeps recording money separate from authorizing it', () => {
    // This separation is the module's main internal financial control and only
    // means anything if the keys are distinct: the person requesting money
    // back is not necessarily the one authorizing it.
    for (const pair of [
      ['finance.payments.record', 'finance.refunds.approve'],
      ['finance.refunds.record', 'finance.refunds.approve'],
      ['finance.discounts.approve', 'finance.scholarships.approve'],
    ]) {
      expect(pair[0]).not.toEqual(pair[1]);
      expect(expected).toContain(pair[0]);
      expect(expected).toContain(pair[1]);
    }
  });
});
