import { BatchFinancialPolicy } from '../../../src/modules/program-batches/financial/batch-financial.policy';
import { ValidationException } from '../../../src/core/exceptions';
import type { BatchFinancialProfileDto } from '../../../src/modules/program-batches/batches/dto/batch-financial.dto';

const profile = (): BatchFinancialProfileDto => ({
  programPrice: { amount: '1000.00', currency: 'EGP', precision: 2 },
  registrationFee: { amount: '100.00', currency: 'EGP', precision: 2 },
  installmentsEnabled: true,
  installmentPlans: [
    {
      id: crypto.randomUUID(),
      name: 'خطة كاملة',
      basis: 'percentage',
      coveredCharge: 'combined',
      status: 'active',
      position: 1,
      installments: [
        {
          id: crypto.randomUUID(),
          label: 'الأول',
          value: '50.00',
          milestone: 'registration-start',
          position: 1,
        },
        {
          id: crypto.randomUUID(),
          label: 'الثاني',
          value: '50.00',
          milestone: 'study-start',
          position: 2,
        },
      ],
    },
  ],
  offers: [],
});

describe('BatchFinancialPolicy', () => {
  const policy = new BatchFinancialPolicy();

  it('accepts exact balanced percentage installments', () => {
    expect(() => policy.validate(profile())).not.toThrow();
  });

  it('rejects percentage installments that do not total 100', () => {
    const value = profile();
    value.installmentPlans[0].installments[1].value = '40.00';
    expect(() => policy.validate(value)).toThrow(ValidationException);
  });

  it('rejects percentages above 100', () => {
    const value = profile();
    value.offers.push({
      id: crypto.randomUUID(),
      kind: 'discount',
      name: 'غير صالح',
      valueType: 'percentage',
      value: '100.01',
      precision: 2,
      status: 'active',
      position: 1,
    });
    expect(() => policy.validate(value)).toThrow(ValidationException);
  });
});
