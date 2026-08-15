import type { InvoiceStatus, RefundStatus } from "../types/common"
import { financePermissions } from "../config/finance-permissions"

/**
 * Invoice lifecycle.
 *
 * Only the *decisions* live here — Draft → Issued and → Cancelled. Partially Paid
 * and Paid are consequences of money recorded and are derived in
 * `finance-status.ts`, so they can never contradict the payments (research R10).
 */
export interface InvoiceTransitionRule {
  permission: string
  reasonRequired: boolean
  /** Refused while the invoice carries any payment (spec FR-008). */
  blockedByPayments?: true
}

export const invoiceTransitionPolicy: Record<
  InvoiceStatus,
  Partial<Record<InvoiceStatus, InvoiceTransitionRule>>
> = {
  draft: {
    issued: {
      permission: financePermissions.invoicesIssue,
      reasonRequired: false,
    },
    cancelled: {
      permission: financePermissions.invoicesCancel,
      reasonRequired: true,
    },
  },
  issued: {
    cancelled: {
      permission: financePermissions.invoicesCancel,
      reasonRequired: true,
      blockedByPayments: true,
    },
  },
  "partially-paid": {
    cancelled: {
      permission: financePermissions.invoicesCancel,
      reasonRequired: true,
      blockedByPayments: true,
    },
  },
  paid: {},
  cancelled: {},
}

export function invoiceTransitionRule(
  from: InvoiceStatus,
  to: InvoiceStatus
): InvoiceTransitionRule | undefined {
  return invoiceTransitionPolicy[from]?.[to]
}

export function allowedInvoiceTransitions(from: InvoiceStatus): InvoiceStatus[] {
  return Object.keys(invoiceTransitionPolicy[from] ?? {}) as InvoiceStatus[]
}

export type InvoiceTransitionEvaluation =
  | { ok: true; rule: InvoiceTransitionRule }
  | {
      ok: false
      code:
        | "invoice-immutable"
        | "forbidden"
        | "validation-failed"
        | "invoice-has-payments"
      allowed: InvoiceStatus[]
    }

export function evaluateInvoiceTransition(input: {
  from: InvoiceStatus
  to: InvoiceStatus
  reason?: string
  permissions: readonly string[]
  hasPayments: boolean
}): InvoiceTransitionEvaluation {
  const allowed = allowedInvoiceTransitions(input.from)
  const rule = invoiceTransitionRule(input.from, input.to)
  if (!rule) return { ok: false, code: "invoice-immutable", allowed }
  if (!input.permissions.includes(rule.permission))
    return { ok: false, code: "forbidden", allowed }
  if (rule.blockedByPayments && input.hasPayments)
    return { ok: false, code: "invoice-has-payments", allowed }
  if (rule.reasonRequired && !input.reason?.trim())
    return { ok: false, code: "validation-failed", allowed }
  return { ok: true, rule }
}

/** Draft figures are editable; issued figures are frozen (spec FR-007). */
export function isEditable(status: InvoiceStatus): boolean {
  return status === "draft"
}

/**
 * Refund lifecycle. Recording and approving are separate permissions so the
 * person requesting money back is not necessarily the one authorizing it
 * (spec FR-041).
 */
export interface RefundTransitionRule {
  permission: string
  reasonRequired: boolean
}

export const refundTransitionPolicy: Record<
  RefundStatus,
  Partial<Record<RefundStatus, RefundTransitionRule>>
> = {
  requested: {
    approved: {
      permission: financePermissions.refundsApprove,
      reasonRequired: false,
    },
    rejected: {
      permission: financePermissions.refundsApprove,
      reasonRequired: true,
    },
    cancelled: {
      permission: financePermissions.refundsRecord,
      reasonRequired: true,
    },
  },
  approved: {
    completed: {
      permission: financePermissions.refundsApprove,
      reasonRequired: false,
    },
    cancelled: {
      permission: financePermissions.refundsApprove,
      reasonRequired: true,
    },
  },
  completed: {},
  rejected: {},
  cancelled: {},
}

export function refundTransitionRule(
  from: RefundStatus,
  to: RefundStatus
): RefundTransitionRule | undefined {
  return refundTransitionPolicy[from]?.[to]
}

export function allowedRefundTransitions(from: RefundStatus): RefundStatus[] {
  return Object.keys(refundTransitionPolicy[from] ?? {}) as RefundStatus[]
}

/** Only a completed refund moves money in the derivation (spec FR-027). */
export function affectsBalance(status: RefundStatus): boolean {
  return status === "completed"
}
