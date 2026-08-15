import { ProductPolicy } from '../../../src/modules/catalog/products/product.policy';
const identity = { instructor: jest.fn(), instructors: jest.fn() };
const organization = {
  organizationId: jest.fn(),
  resolve: jest.fn(),
  options: jest.fn(),
  category: jest.fn(),
  categories: jest.fn(),
  lookup: jest.fn(),
  lookupOptions: jest.fn(),
};
describe('ProductPolicy', () => {
  const policy = new ProductPolicy(identity, organization);
  it('implements the exact lifecycle graph and terminal archive', () => {
    expect(() =>
      policy.assertTransition('DRAFT', 'ACTIVE', { ready: true, issues: [] }),
    ).not.toThrow();
    expect(() =>
      policy.assertTransition('ARCHIVED', 'ACTIVE', {
        ready: true,
        issues: [],
      }),
    ).toThrow();
    expect(() =>
      policy.assertTransition('DRAFT', 'HIDDEN', { ready: true, issues: [] }),
    ).toThrow();
  });
  it('blocks activation when readiness has issues', () => {
    expect(() =>
      policy.assertTransition('DRAFT', 'ACTIVE', {
        ready: false,
        issues: [{ code: 'X', field: 'pricing', message: 'x' }],
      }),
    ).toThrow();
  });
  it('reports all core readiness gaps', () => {
    const result = policy.readiness({
      description: '',
      pricing: null,
      branches: [],
      productType: { identity: 'TRAINING_COURSE' },
      numberOfTerms: null,
      numberOfSessions: null,
      numberOfHours: null,
      instructorEmployeeId: null,
    });
    expect(result.ready).toBe(false);
    expect(result.issues.map((x) => x.code)).toEqual(
      expect.arrayContaining([
        'DESCRIPTION_REQUIRED',
        'PRICING_REQUIRED',
        'BRANCH_REQUIRED',
        'COURSE_PROFILE_REQUIRED',
      ]),
    );
  });
});
