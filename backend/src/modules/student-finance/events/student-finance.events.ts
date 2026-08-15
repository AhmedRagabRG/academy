import type { DomainEvent } from '../../../core/events/domain-event.bus';

export const FINANCE_EVENT_NAMES = {
  accountProvisioned: 'finance.account.provisioned',
  invoiceRaised: 'finance.invoice.raised',
  invoiceUpdated: 'finance.invoice.updated',
  invoiceIssued: 'finance.invoice.issued',
  invoiceCancelled: 'finance.invoice.cancelled',
  installmentPlanGenerated: 'finance.installment-plan.generated',
  paymentRecorded: 'finance.payment.recorded',
  discountApproved: 'finance.discount.approved',
  scholarshipApproved: 'finance.scholarship.approved',
  adjustmentRecorded: 'finance.adjustment.recorded',
  refundRequested: 'finance.refund.requested',
  refundDecided: 'finance.refund.decided',
  refundCompleted: 'finance.refund.completed',
} as const;

export type FinanceEventName =
  (typeof FINANCE_EVENT_NAMES)[keyof typeof FINANCE_EVENT_NAMES];

export type FinanceTargetType =
  'finance-account' | 'invoice' | 'payment' | 'refund' | 'installment-plan';

/**
 * The only payload fields an audit subscriber may receive. Amounts are minor
 * units as strings because a domain event must survive JSON serialization
 * without a BigInt, and no student name, address, national identifier or note
 * content ever appears here (constitution Principle X).
 */
export interface FinanceEventPayload {
  operation: string;
  studentId?: string;
  invoiceId?: string;
  amountMinor?: string;
  currency?: string;
  resultVersion?: number;
  fromStatus?: string;
  toStatus?: string;
  [key: string]: string | number | boolean | undefined;
}

/**
 * Audit-ready events emitted only after the transaction commits. Persisting
 * them later must require a new subscriber, never a change to business logic
 * (constitution Principle X).
 */
export function financeEvent(
  name: FinanceEventName,
  input: {
    actorId: string | null;
    targetType: FinanceTargetType;
    targetId: string;
    operation: string;
    payload?: Omit<FinanceEventPayload, 'operation'>;
  },
): DomainEvent {
  return {
    name,
    occurredAt: new Date().toISOString(),
    actor: input.actorId ? { accountId: input.actorId } : null,
    target: { type: input.targetType, id: input.targetId },
    operation: input.operation,
    payload: { ...(input.payload ?? {}), operation: input.operation },
  };
}
