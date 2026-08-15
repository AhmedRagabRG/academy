import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../constants';
import type { PageQuery, PageResult } from '../types/pagination';
export function normalizePageQuery(query: PageQuery): Required<PageQuery> {
  return {
    page: Math.max(1, query.page ?? 1),
    pageSize: Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, query.pageSize ?? DEFAULT_PAGE_SIZE),
    ),
  };
}
export function pageOffset(query: PageQuery): number {
  const q = normalizePageQuery(query);
  return (q.page - 1) * q.pageSize;
}
export function createPageResult<T>(
  items: T[],
  total: number,
  query: PageQuery,
): PageResult<T> {
  const q = normalizePageQuery(query);
  return { items, total, ...q, totalPages: Math.ceil(total / q.pageSize) };
}
