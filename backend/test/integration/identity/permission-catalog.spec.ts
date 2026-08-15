import { PERMISSION_CATALOG } from '../../../prisma/seeds/permission-catalog';

describe('canonical permission catalogue', () => {
  it('matches the documented module totals and stable ordering exactly', () => {
    const totals = PERMISSION_CATALOG.reduce<Record<string, number>>(
      (result, { moduleKey }) => ({
        ...result,
        [moduleKey]: (result[moduleKey] ?? 0) + 1,
      }),
      {},
    );
    expect(totals).toEqual({
      dashboard: 1,
      settings: 29,
      catalog: 20,
      batches: 13,
      admissions: 18,
      students: 15,
      finance: 16,
      accounting: 16,
    });
    expect(PERMISSION_CATALOG.map(({ displayOrder }) => displayOrder)).toEqual(
      Array.from({ length: 128 }, (_, index) => index),
    );
    expect(
      PERMISSION_CATALOG.every(
        ({ label, description }) =>
          /[\u0600-\u06ff]/.test(label) && description === label,
      ),
    ).toBe(true);
  });
});
