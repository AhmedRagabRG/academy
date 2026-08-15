import { Inject, Injectable } from '@nestjs/common';
import type { ExpenseRequest } from '../../../../prisma/generated/client';
import { BranchScopeService } from '../../../core/authorization/branch-scope.service';
import {
  ExpenseInvalidCategoryException,
  ExpenseNotFoundException,
  ExpenseValidationException,
} from '../../../core/exceptions/accounting.exceptions';
import { TransactionManager } from '../../../database/transaction.manager';
import type { CallerContext } from '../../../shared/types/caller-context';
import {
  ORGANIZATION_SETTINGS_PORT,
  type OrganizationSettingsPort,
} from '../../organization/types/organization-settings.port';
import {
  ORGANIZATION_MASTER_DATA_PORT,
  type OrganizationMasterDataPort,
} from '../../organization/types/organization-master-data.port';
import type { CreateExpenseDto } from '../dtos/create-expense.dto';
import type { UpdateExpenseDto } from '../dtos/update-expense.dto';
import { ExpenseEventEmitter } from '../events/expense.events';
import { ExpensesPolicy } from '../policies/expenses.policy';
import { ApprovalHistoryRepository } from '../repositories/approval-history.repository';
import { AttachmentsRepository } from '../repositories/attachments.repository';
import { ExpensesRepository } from '../repositories/expenses.repository';
import {
  EXPENSE_CATEGORY_GROUP,
  EXPENSE_SUBCATEGORY_GROUP,
  ExpenseApprovalAction,
  ExpenseStatus,
} from '../types/expense.types';

@Injectable()
export class ExpenseService {
  constructor(
    private readonly expenses: ExpensesRepository,
    private readonly attachments: AttachmentsRepository,
    private readonly history: ApprovalHistoryRepository,
    private readonly policy: ExpensesPolicy,
    private readonly events: ExpenseEventEmitter,
    private readonly transactions: TransactionManager,
    private readonly branchScope: BranchScopeService,
    @Inject(ORGANIZATION_MASTER_DATA_PORT)
    private readonly organization: OrganizationMasterDataPort,
    @Inject(ORGANIZATION_SETTINGS_PORT)
    private readonly settings: OrganizationSettingsPort,
  ) {}

  async createExpense(
    caller: CallerContext,
    dto: CreateExpenseDto,
  ): Promise<ExpenseRequest> {
    this.policy.assertPositiveAmount(dto.amount);
    this.policy.assertExpenseDateNotFuture(dto.expenseDate);
    await this.assertCategories(dto.categoryId, dto.subcategoryId);

    const branchId = dto.branchId ?? caller.authorizedBranchIds[0];
    if (!branchId) {
      throw new ExpenseValidationException([
        { field: 'branchId', message: 'required' },
      ]);
    }
    this.branchScope.assertInScope(caller, branchId);

    /**
     * The denomination is the organization's, never the caller's.
     *
     * Accepting an arbitrary currency per request let a single branch's ledger
     * hold two of them, and totalling a mixed set is undefined without a rate
     * this module has no business inventing. A caller may still state the
     * currency — it is refused when it disagrees, rather than silently
     * recorded.
     */
    const { currency, precision } = await this.settings.financialDefaults();
    if (dto.currency && dto.currency.toUpperCase() !== currency.toUpperCase()) {
      throw new ExpenseValidationException([
        { field: 'currency', message: `must-be-${currency}` },
      ]);
    }

    const expense = await this.transactions.run(async (tx) => {
      const created = await this.expenses.create(
        {
          expenseNumber: await this.allocateExpenseNumber(),
          branchId,
          categoryId: dto.categoryId,
          subcategoryId: dto.subcategoryId,
          requestedById: caller.accountId,
          expenseDate: dto.expenseDate,
          description: dto.description,
          amount: dto.amount,
          currency,
          precision,
          status: ExpenseStatus.DRAFT,
        },
        tx,
      );

      await this.history.create(
        {
          expenseRequest: { connect: { id: created.id } },
          action: ExpenseApprovalAction.CREATE,
          newStatus: ExpenseStatus.DRAFT,
          performedById: caller.accountId,
          performedByName: caller.displayName,
        },
        tx,
      );

      return created;
    });

    this.events.emitExpenseCreated(expense, caller.accountId);
    return expense;
  }

  async getExpense(caller: CallerContext, id: string): Promise<ExpenseRequest> {
    const expense = await this.expenses.findById(id);
    if (!expense) throw new ExpenseNotFoundException();
    this.branchScope.assertInScope(caller, expense.branchId);
    return expense;
  }

  /** Draft and Returned are the only states whose fields a requester owns. */
  async updateExpense(
    caller: CallerContext,
    id: string,
    dto: UpdateExpenseDto,
  ): Promise<ExpenseRequest> {
    const expense = await this.getExpense(caller, id);
    this.policy.assertEditable(expense.status as ExpenseStatus);
    this.policy.assertVersion(expense.version, dto.expectedVersion);

    if (dto.amount) this.policy.assertPositiveAmount(dto.amount);
    if (dto.expenseDate)
      this.policy.assertExpenseDateNotFuture(dto.expenseDate);
    if (dto.categoryId || dto.subcategoryId) {
      await this.assertCategories(
        dto.categoryId ?? expense.categoryId,
        dto.subcategoryId ?? expense.subcategoryId,
      );
    }

    const updated = await this.transactions.run(async (tx) => {
      const row = await this.expenses.updateWithVersion(
        id,
        dto.expectedVersion,
        {
          ...(dto.expenseDate ? { expenseDate: dto.expenseDate } : {}),
          ...(dto.description ? { description: dto.description } : {}),
          ...(dto.amount ? { amount: dto.amount } : {}),
          ...(dto.categoryId ? { categoryId: dto.categoryId } : {}),
          ...(dto.subcategoryId ? { subcategoryId: dto.subcategoryId } : {}),
        },
        tx,
      );

      // No approval-history row here: an edit is not a workflow decision, and
      // the table records decisions. The domain event is the audit trail for
      // field changes.
      return row;
    });

    this.events.emitExpenseUpdated(updated, caller.accountId);
    return updated;
  }

  async submitExpense(
    caller: CallerContext,
    id: string,
    expectedVersion: number,
  ): Promise<ExpenseRequest> {
    const expense = await this.getExpense(caller, id);
    this.policy.assertTransition(
      expense.status as ExpenseStatus,
      ExpenseStatus.SUBMITTED,
    );
    this.policy.assertVersion(expense.version, expectedVersion);

    // Evidence is mandatory: a submitted claim with no document cannot be
    // audited later.
    const attachments = await this.attachments.findByExpenseId(id);
    this.policy.assertHasAttachments(attachments.length);

    const updated = await this.transactions.run(async (tx) => {
      const row = await this.expenses.updateWithVersion(
        id,
        expectedVersion,
        { status: ExpenseStatus.SUBMITTED },
        tx,
      );

      await this.history.create(
        {
          expenseRequest: { connect: { id } },
          action: ExpenseApprovalAction.SUBMIT,
          previousStatus: expense.status,
          newStatus: ExpenseStatus.SUBMITTED,
          performedById: caller.accountId,
          performedByName: caller.displayName,
        },
        tx,
      );

      return row;
    });

    this.events.emitExpenseSubmitted(updated, caller.accountId, expense.status);
    return updated;
  }

  async archiveExpense(
    caller: CallerContext,
    id: string,
    expectedVersion: number,
  ): Promise<ExpenseRequest> {
    const expense = await this.getExpense(caller, id);
    this.policy.assertArchivable(expense.status as ExpenseStatus);
    this.policy.assertVersion(expense.version, expectedVersion);

    const archived = await this.transactions.run(async (tx) => {
      const row = await this.expenses.archive(id, expectedVersion, tx);

      await this.history.create(
        {
          expenseRequest: { connect: { id } },
          action: ExpenseApprovalAction.ARCHIVE,
          previousStatus: expense.status,
          newStatus: ExpenseStatus.ARCHIVED,
          performedById: caller.accountId,
          performedByName: caller.displayName,
        },
        tx,
      );

      return row;
    });

    this.events.emitExpenseArchived(archived, caller.accountId, expense.status);
    return archived;
  }

  /**
   * Both lookups are resolved against Organization rather than trusted from
   * the client, so a deactivated category cannot be reused by a stale form.
   */
  private async assertCategories(
    categoryId: string,
    subcategoryId: string,
  ): Promise<void> {
    const category = await this.organization.resolveValue(
      EXPENSE_CATEGORY_GROUP,
      categoryId,
    );
    if (!category?.active) {
      throw new ExpenseInvalidCategoryException('categoryId');
    }

    const subcategory = await this.organization.resolveValue(
      EXPENSE_SUBCATEGORY_GROUP,
      subcategoryId,
    );
    if (!subcategory?.active) {
      throw new ExpenseInvalidCategoryException('subcategoryId');
    }
  }

  /**
   * `EXP-{seq}-{date}` per the contract. The sequence is derived from the
   * count already issued for that date and the unique index is the real guard:
   * two concurrent creates race, the loser retries rather than silently
   * reusing a number.
   */
  private async allocateExpenseNumber(): Promise<string> {
    const now = new Date();
    const dateSuffix = now.toISOString().slice(0, 10);
    const base = await this.expenses.countForDate(dateSuffix);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const seq = String(base + 1 + attempt).padStart(3, '0');
      const candidate = `EXP-${seq}-${dateSuffix}`;
      const taken = await this.expenses.findByExpenseNumber(candidate);
      if (!taken) return candidate;
    }

    throw new ExpenseValidationException([
      { field: 'expenseNumber', message: 'allocation-failed' },
    ]);
  }
}
