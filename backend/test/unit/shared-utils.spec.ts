import {
  createPageResult,
  normalizePageQuery,
} from '../../src/shared/pagination/pagination.helper';
import { inclusiveEndOfDay } from '../../src/shared/utils/date-range.util';
import {
  fromMinorUnits,
  toMinorUnits,
} from '../../src/shared/utils/money.util';
describe('shared utilities', () => {
  it('clamps pagination and supports over-range empty pages', () => {
    expect(normalizePageQuery({ pageSize: 500 })).toEqual({
      page: 1,
      pageSize: 100,
    });
    expect(createPageResult([], 137, { page: 99, pageSize: 20 })).toEqual({
      items: [],
      total: 137,
      page: 99,
      pageSize: 20,
      totalPages: 7,
    });
  });
  it('converts money without floating point', () =>
    expect(
      fromMinorUnits(
        toMinorUnits({ amount: '18000.05', currency: 'EGP', precision: 2 }),
        'EGP',
        2,
      ).amount,
    ).toBe('18000.05'));
  it('includes a full UTC day', () =>
    expect(inclusiveEndOfDay('2026-08-02').toISOString()).toBe(
      '2026-08-02T23:59:59.999Z',
    ));
});
