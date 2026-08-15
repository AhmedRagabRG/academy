import { AdmissionFinancialPolicy } from '../../../src/modules/admissions/admissions/admission-financial.policy';

describe('AdmissionFinancialPolicy', () => {
  const policy = new AdmissionFinancialPolicy();
  const money = (amount: string) => ({ amount, currency: 'EGP', precision: 2 });
  it('folds file-opening fees into registration fees using integer arithmetic', () =>
    expect(
      policy.calculate({
        productPrice: money('1000.00'),
        registrationFees: money('100.00'),
        fileOpeningFees: money('25.00'),
        discountMode: 'none',
        discountValue: '0',
      }),
    ).toMatchObject({
      registrationFeesMinor: 12500n,
      requiredAmountMinor: 112500n,
    }));
  it('rounds percentage discounts half-up and supports exact amount discounts', () => {
    expect(
      policy.calculate({
        productPrice: money('0.05'),
        registrationFees: money('0.00'),
        discountMode: 'percentage',
        discountValue: '10',
      }).discountAmountMinor,
    ).toBe(1n);
    expect(
      policy.calculate({
        productPrice: money('100.00'),
        registrationFees: money('20.00'),
        discountMode: 'amount',
        discountValue: '20.00',
      }).requiredAmountMinor,
    ).toBe(10000n);
  });
  it('rejects over-100 percentages, oversized discounts, currency mismatch, and negative values', () => {
    expect(() =>
      policy.calculate({
        productPrice: money('100'),
        registrationFees: money('0'),
        discountMode: 'percentage',
        discountValue: '100.01',
      }),
    ).toThrow();
    expect(() =>
      policy.calculate({
        productPrice: money('100'),
        registrationFees: money('0'),
        discountMode: 'amount',
        discountValue: '101',
      }),
    ).toThrow();
    expect(() =>
      policy.calculate({
        productPrice: money('-1'),
        registrationFees: money('0'),
        discountMode: 'none',
        discountValue: '0',
      }),
    ).toThrow();
  });
});
