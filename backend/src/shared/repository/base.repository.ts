import type { Prisma } from '../../../prisma/generated/client';
import { VersionConflictException } from '../../core/exceptions';
import { PrismaService } from '../../database/prisma.service';
import {
  createPageResult,
  normalizePageQuery,
  pageOffset,
} from '../pagination/pagination.helper';
import type { CallerContext } from '../types/caller-context';
import type { PageQuery, PageResult } from '../types/pagination';
export interface PaginatedQuery<T> {
  findMany(skip: number, take: number): Promise<T[]>;
  count(): Promise<number>;
}
export abstract class BaseRepository<TModel, TDelegate> {
  declare protected readonly modelType?: TModel;
  protected constructor(
    protected readonly prisma: PrismaService,
    protected readonly delegate: TDelegate,
  ) {}
  protected async paginate<T>(
    args: PageQuery,
    query: PaginatedQuery<T>,
  ): Promise<PageResult<T>> {
    const normalized = normalizePageQuery(args);
    const [items, total] = await Promise.all([
      query.findMany(pageOffset(normalized), normalized.pageSize),
      query.count(),
    ]);
    return createPageResult(items, total, normalized);
  }
  protected assertVersion(current: number, expected: number): void {
    if (current !== expected) throw new VersionConflictException(current);
  }
  protected scopeToBranches(
    caller: CallerContext,
    where: Record<string, unknown>,
  ): Record<string, unknown> {
    return caller.organizationWide
      ? where
      : { AND: [where, { branchId: { in: caller.authorizedBranchIds } }] };
  }
  protected withTransaction(tx?: Prisma.TransactionClient): TDelegate {
    return (tx ?? this.delegate) as TDelegate;
  }
}
