import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../prisma/generated/client';
import { ExpenseOutOfScopeException } from '../../../core/exceptions/accounting.exceptions';
import type { CallerContext } from '../../../shared/types/caller-context';
import {
  normalizeArabic,
  normalizeDigits,
} from '../../../shared/utils/arabic-normalize';
import { ExpenseQueryDto, toStoredStatus } from '../dtos/expense-query.dto';
import { AttachmentsRepository } from '../repositories/attachments.repository';
import { ExpensesRepository } from '../repositories/expenses.repository';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

@Injectable()
export class ExpenseSearchService {
  constructor(
    private readonly expenses: ExpensesRepository,
    private readonly attachments: AttachmentsRepository,
  ) {}

  /**
   * Branch scope is applied as a `where` clause rather than filtered after the
   * fact, so the reported `total` matches what the caller may actually see —
   * a count that includes rows the user cannot open is a leak.
   */
  async listExpenses(caller: CallerContext, query: ExpenseQueryDto) {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(
      query.pageSize ?? DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE,
    );
    const skip = (page - 1) * pageSize;

    const branchIds = this.resolveBranchScope(caller, query.branchId);

    // Folded so "مكتب" matches "مكتب" regardless of alif/ya form, and so an
    // Arabic-Indic digit in an expense number finds its ASCII counterpart.
    const search = query.search
      ? normalizeArabic(normalizeDigits(query.search))
      : undefined;

    const where: Prisma.ExpenseRequestWhereInput = {
      ...(branchIds ? { branchId: { in: branchIds } } : {}),
      ...(query.status
        ? { status: toStoredStatus(query.status) as never }
        : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.subcategoryId ? { subcategoryId: query.subcategoryId } : {}),
      ...(query.requestedBy ? { requestedById: query.requestedBy } : {}),
      ...(query.approvedBy
        ? {
            approvalHistory: {
              some: {
                performedById: query.approvedBy,
                action: 'APPROVE',
              },
            },
          }
        : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            expenseDate: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              // Inclusive upper bound: a date-only filter means the whole day.
              ...(query.dateTo
                ? { lte: new Date(`${query.dateTo}T23:59:59.999Z`) }
                : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { expenseNumber: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.includeArchived ? {} : { isArchived: false }),
    };

    const { data, total } = await this.expenses.findMany(
      where,
      pageSize,
      skip,
      this.orderBy(query),
    );

    // Counted for the page just read, as one grouped query rather than one
    // per row.
    const attachmentCounts = await this.attachments.countByExpenseIds(
      data.map((expense) => expense.id),
    );

    return {
      data,
      attachmentCounts,
      meta: {
        total,
        page,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  private orderBy(
    query: ExpenseQueryDto,
  ): Prisma.ExpenseRequestOrderByWithRelationInput {
    const direction = query.sortOrder === 'asc' ? 'asc' : 'desc';
    switch (query.sortBy) {
      case 'expenseDate':
        return { expenseDate: direction };
      case 'amount':
        return { amount: direction };
      case 'status':
        return { status: direction };
      default:
        return { createdAt: direction };
    }
  }

  /**
   * A branch filter may narrow the caller's scope but never widen it. Asking
   * for a branch outside that scope is refused outright rather than silently
   * returning an empty page, because the two mean different things.
   */
  private resolveBranchScope(
    caller: CallerContext,
    requested?: string,
  ): string[] | undefined {
    if (caller.organizationWide) {
      return requested ? [requested] : undefined;
    }
    if (requested) {
      if (!caller.authorizedBranchIds.includes(requested)) {
        throw new ExpenseOutOfScopeException();
      }
      return [requested];
    }
    return caller.authorizedBranchIds;
  }
}
