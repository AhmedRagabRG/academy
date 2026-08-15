import { Injectable } from '@nestjs/common';
import {
  DomainEventBus,
  type DomainEvent,
} from '../../../core/events/domain-event.bus';
import { ExpenseRequest } from '../../../../prisma/generated/client';

export const EXPENSE_EVENT_NAMES = {
  created: 'accounting.expense.created',
  updated: 'accounting.expense.updated',
  submitted: 'accounting.expense.submitted',
  approved: 'accounting.expense.approved',
  rejected: 'accounting.expense.rejected',
  returned: 'accounting.expense.returned',
  archived: 'accounting.expense.archived',
} as const;

export type ExpenseEventName =
  (typeof EXPENSE_EVENT_NAMES)[keyof typeof EXPENSE_EVENT_NAMES];

/**
 * The only payload fields an audit subscriber may receive. The expense
 * description is free text entered by a requester and never leaves the
 * aggregate, so it is deliberately absent here.
 */
export interface ExpenseEventPayload {
  operation: string;
  expenseNumber?: string;
  branchId?: string;
  categoryId?: string;
  amount?: string;
  currency?: string;
  fromStatus?: string;
  toStatus?: string;
  resultVersion?: number;
  [key: string]: string | number | boolean | undefined;
}

/**
 * Audit-ready events built in the shape `DomainEventBus` expects, mirroring
 * `financeEvent` so a future audit subscriber can treat both modules alike.
 */
export function expenseEvent(
  name: ExpenseEventName,
  input: {
    actorId: string | null;
    targetId: string;
    operation: string;
    payload?: Omit<ExpenseEventPayload, 'operation'>;
  },
): DomainEvent {
  return {
    name,
    occurredAt: new Date().toISOString(),
    actor: input.actorId ? { accountId: input.actorId } : null,
    target: { type: 'expense-request', id: input.targetId },
    operation: input.operation,
    payload: { ...(input.payload ?? {}), operation: input.operation },
  };
}

@Injectable()
export class ExpenseEventEmitter {
  constructor(private readonly eventBus: DomainEventBus) {}

  private emit(
    name: ExpenseEventName,
    operation: string,
    expense: ExpenseRequest,
    actorId: string | null,
    fromStatus?: string,
  ): void {
    this.eventBus.emit(
      expenseEvent(name, {
        actorId,
        targetId: expense.id,
        operation,
        payload: {
          expenseNumber: expense.expenseNumber,
          branchId: expense.branchId,
          categoryId: expense.categoryId,
          amount: expense.amount,
          currency: expense.currency,
          ...(fromStatus ? { fromStatus } : {}),
          toStatus: expense.status,
          resultVersion: expense.version,
        },
      }),
    );
  }

  emitExpenseCreated(expense: ExpenseRequest, actorId: string | null): void {
    this.emit(EXPENSE_EVENT_NAMES.created, 'created', expense, actorId);
  }

  emitExpenseUpdated(expense: ExpenseRequest, actorId: string | null): void {
    this.emit(EXPENSE_EVENT_NAMES.updated, 'updated', expense, actorId);
  }

  emitExpenseSubmitted(
    expense: ExpenseRequest,
    actorId: string | null,
    fromStatus?: string,
  ): void {
    this.emit(
      EXPENSE_EVENT_NAMES.submitted,
      'submitted',
      expense,
      actorId,
      fromStatus,
    );
  }

  emitExpenseApproved(
    expense: ExpenseRequest,
    actorId: string | null,
    fromStatus?: string,
  ): void {
    this.emit(
      EXPENSE_EVENT_NAMES.approved,
      'approved',
      expense,
      actorId,
      fromStatus,
    );
  }

  emitExpenseRejected(
    expense: ExpenseRequest,
    actorId: string | null,
    fromStatus?: string,
  ): void {
    this.emit(
      EXPENSE_EVENT_NAMES.rejected,
      'rejected',
      expense,
      actorId,
      fromStatus,
    );
  }

  emitExpenseReturned(
    expense: ExpenseRequest,
    actorId: string | null,
    fromStatus?: string,
  ): void {
    this.emit(
      EXPENSE_EVENT_NAMES.returned,
      'returned',
      expense,
      actorId,
      fromStatus,
    );
  }

  emitExpenseArchived(
    expense: ExpenseRequest,
    actorId: string | null,
    fromStatus?: string,
  ): void {
    this.emit(
      EXPENSE_EVENT_NAMES.archived,
      'archived',
      expense,
      actorId,
      fromStatus,
    );
  }
}
