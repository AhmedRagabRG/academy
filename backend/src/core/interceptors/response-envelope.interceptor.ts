import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';
import type { PageResult } from '../../shared/types/pagination';
function isPageResult(value: unknown): value is PageResult<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as PageResult<unknown>).items) &&
    typeof (value as PageResult<unknown>).total === 'number'
  );
}
@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(
      map((value: unknown) =>
        isPageResult(value)
          ? {
              success: true,
              data: value.items,
              meta: {
                total: value.total,
                page: value.page,
                limit: value.pageSize,
                totalPages: value.totalPages,
                ...('nextCursor' in value
                  ? { nextCursor: value.nextCursor }
                  : {}),
                ...('queryFingerprint' in value
                  ? { queryFingerprint: value.queryFingerprint }
                  : {}),
              },
            }
          : { success: true, data: value },
      ),
    );
  }
}
