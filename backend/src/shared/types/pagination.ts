export interface PageQuery {
  page?: number;
  pageSize?: number;
}
export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
export interface CursorResult<T> {
  items: T[];
  nextCursor?: string;
}
