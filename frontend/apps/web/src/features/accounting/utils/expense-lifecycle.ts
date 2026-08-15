import type { ExpenseStatus } from "../types/common"
import { accountingPermissions } from "../config/accounting-permissions"

/**
 * The expense-request lifecycle, as a table rather than as code paths.
 *
 * Eight statuses and eleven transitions with three distinct authorities become an
 * unmaintainable `if` chain, and the UI inevitably drifts from the service. Here
 * both read the same table: the service evaluates a transition by looking it up,
 * and the UI derives which actions to offer from `allowedTransitions`. A policy
 * change reaches the screen with no UI edit.
 *
 * It also makes spec FR-022a structural rather than aspirational — review
 * authority *is* a permission key, because the table has nowhere to put a role.
 */
export interface TransitionRule {
  permission: string
  /** A negative outcome must say why (spec FR-023). */
  reasonRequired: boolean
}

export const expenseTransitionPolicy: Record<
  ExpenseStatus,
  Partial<Record<ExpenseStatus, TransitionRule>>
> = {
  draft: {
    submitted: {
      permission: accountingPermissions.requestsSubmit,
      reasonRequired: false,
    },
    cancelled: {
      permission: accountingPermissions.requestsCancel,
      reasonRequired: true,
    },
  },
  submitted: {
    "under-review": {
      permission: accountingPermissions.requestsReview,
      reasonRequired: false,
    },
    cancelled: {
      permission: accountingPermissions.requestsCancel,
      reasonRequired: true,
    },
  },
  "under-review": {
    approved: {
      permission: accountingPermissions.requestsDecide,
      reasonRequired: false,
    },
    rejected: {
      permission: accountingPermissions.requestsDecide,
      reasonRequired: true,
    },
    "returned-for-revision": {
      permission: accountingPermissions.requestsDecide,
      reasonRequired: true,
    },
    cancelled: {
      permission: accountingPermissions.requestsCancel,
      reasonRequired: true,
    },
  },
  "returned-for-revision": {
    submitted: {
      permission: accountingPermissions.requestsSubmit,
      reasonRequired: false,
    },
    cancelled: {
      permission: accountingPermissions.requestsCancel,
      reasonRequired: true,
    },
  },
  approved: {
    // Marking paid carries its own authority, distinct from approving (FR-027).
    paid: {
      permission: accountingPermissions.requestsMarkPaid,
      reasonRequired: false,
    },
  },
  // Terminal by construction: no outgoing rows means "cannot be edited" and
  // "cannot be cancelled after approval" need no separate guard.
  rejected: {},
  paid: {},
  cancelled: {},
}

export function transitionRule(
  from: ExpenseStatus,
  to: ExpenseStatus
): TransitionRule | undefined {
  return expenseTransitionPolicy[from]?.[to]
}

export function allowedTransitions(from: ExpenseStatus): ExpenseStatus[] {
  return Object.keys(expenseTransitionPolicy[from] ?? {}) as ExpenseStatus[]
}

/** A request is editable only while it is a Draft or Returned (spec FR-013). */
export function isEditable(status: ExpenseStatus): boolean {
  return status === "draft" || status === "returned-for-revision"
}

export function isTerminal(status: ExpenseStatus): boolean {
  return allowedTransitions(status).length === 0
}

/** Which action a transition represents, for the history entry it produces. */
export function actionFor(
  from: ExpenseStatus,
  to: ExpenseStatus
):
  | "submitted"
  | "resubmitted"
  | "review-started"
  | "approved"
  | "rejected"
  | "returned"
  | "paid"
  | "cancelled"
  | undefined {
  if (to === "submitted")
    return from === "returned-for-revision" ? "resubmitted" : "submitted"
  if (to === "under-review") return "review-started"
  if (to === "approved") return "approved"
  if (to === "rejected") return "rejected"
  if (to === "returned-for-revision") return "returned"
  if (to === "paid") return "paid"
  if (to === "cancelled") return "cancelled"
  return undefined
}
