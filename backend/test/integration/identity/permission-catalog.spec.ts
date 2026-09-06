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
      tickets: 15,
      inbox: 15,
      contacts: 9,
      pipeline: 6,
      campaigns: 6,
    });
    expect(PERMISSION_CATALOG.map(({ displayOrder }) => displayOrder)).toEqual(
      Array.from({ length: 81 }, (_, index) => index),
    );
    expect(
      PERMISSION_CATALOG.every(
        ({ label, description }) =>
          /[\u0600-\u06ff]/.test(label) && description === label,
      ),
    ).toBe(true);
  });
});
