import {
  createPageResult,
  normalizePageQuery,
} from '../../src/shared/pagination/pagination.helper';
describe('pagination contract', () => {
  it('defaults to 1/20 and clamps to 100', () => {
    expect(normalizePageQuery({})).toEqual({ page: 1, pageSize: 20 });
    expect(normalizePageQuery({ pageSize: 500 })).toEqual({
      page: 1,
      pageSize: 100,
    });
  });
  it('returns an empty over-range page with accurate metadata', () =>
    expect(createPageResult([], 137, { page: 99, pageSize: 20 })).toEqual({
      items: [],
      total: 137,
      page: 99,
      pageSize: 20,
      totalPages: 7,
    }));
});
