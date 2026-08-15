import { AdmissionFinancialPolicy } from '../../../src/modules/admissions/admissions/admission-financial.policy';
import { AdmissionSelectionPolicy } from '../../../src/modules/admissions/admissions/admission-selection.policy';
import type { AdmissionOfferingReference } from '../../../src/modules/admissions/types/admissions-reference.port';

describe('Admission revision policies', () => {
  const money = { amount: '100.00', currency: 'EGP', precision: 2 };
  const offering = (
    policy: string,
    version: number,
  ): AdmissionOfferingReference => ({
    id: policy,
    code: policy,
    label: policy,
    active: true,
    kind: 'training-course',
    version: 1,
    registrationBranchIds: ['b'],
    studyBranchIds: ['b'],
    price: {
      sourceId: policy,
      sourceVersion: 1,
      productPrice: money,
      registrationFees: money,
    },
    documentPolicyId: policy,
    documentPolicyVersion: version,
  });
  it('requires finance recalculation and policy refresh only when the document policy changes', () => {
    const policy = new AdmissionSelectionPolicy();
    expect(policy.consequences(offering('one', 1), offering('one', 1))).toEqual(
      ['financial-recalculated'],
    );
    const required = policy.consequences(
      offering('one', 1),
      offering('two', 2),
    );
    expect(required).toEqual([
      'financial-recalculated',
      'documents-repolicied',
    ]);
    expect(policy.confirmed(required, ['financial-recalculated'])).toBe(false);
    expect(policy.confirmed(required, required)).toBe(true);
  });
  it('preserves exact minor units for every discount mode and folds opening fees', () => {
    const policy = new AdmissionFinancialPolicy();
    const result = policy.calculate({
      productPrice: { ...money, amount: '999.99' },
      registrationFees: money,
      fileOpeningFees: { ...money, amount: '50.01' },
      discountMode: 'percentage',
      discountValue: '12.5',
    });
    expect(result.registrationFeesMinor).toBe(15001n);
    expect(result.requiredAmountMinor).toBe(
      result.productPriceMinor +
        result.registrationFeesMinor -
        result.discountAmountMinor,
    );
  });
});
