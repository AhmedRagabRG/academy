import { ProductPolicy } from '../../../src/modules/catalog/products/product.policy';
describe('product branch readiness', () => {
  it('requires a registration branch', () => {
    const policy = new ProductPolicy({} as never, {} as never);
    const base = {
      description: 'x',
      pricing: {},
      productType: { identity: 'PROFESSIONAL_DIPLOMA' as const },
      numberOfTerms: null,
      numberOfSessions: 1,
      numberOfHours: null,
      instructorEmployeeId: null,
    };
    expect(
      policy.readiness({ ...base, branches: [{ role: 'STUDY' }] }).ready,
    ).toBe(false);
    expect(
      policy.readiness({ ...base, branches: [{ role: 'REGISTRATION' }] }).ready,
    ).toBe(true);
  });
});
