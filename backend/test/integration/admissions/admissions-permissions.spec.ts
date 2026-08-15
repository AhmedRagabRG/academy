import { PERMISSION_CATALOG } from '../../../prisma/seeds/permission-catalog';

const expected = [
  'admissions.view',
  'admissions.create',
  'admissions.update',
  'admissions.archive',
  'admissions.export',
  'admissions.assign',
  'admissions.academic.manage',
  'admissions.finance.view',
  'admissions.finance.manage',
  'admissions.documents.view',
  'admissions.documents.manage',
  'admissions.documents.verify',
  'admissions.submit',
  'admissions.review',
  'admissions.approve',
  'admissions.reject',
  'admissions.return',
  'admissions.enrollment-readiness',
];

describe('Admissions permission catalogue', () => {
  it('contains exactly the closed Admissions key set with deterministic descriptions', () => {
    const admissions = PERMISSION_CATALOG.filter(({ key }) =>
      key.startsWith('admissions.'),
    );
    expect(admissions.map(({ key }) => key)).toEqual(expected);
    expect(new Set(admissions.map(({ key }) => key)).size).toBe(
      expected.length,
    );
    expect(admissions.every(({ description }) => description.length > 10)).toBe(
      true,
    );
  });

  it('is safe to seed repeatedly because every catalogue key is unique', () => {
    const twice = [...PERMISSION_CATALOG, ...PERMISSION_CATALOG];
    expect(new Set(twice.map(({ key }) => key)).size).toBe(
      PERMISSION_CATALOG.length,
    );
  });
});
