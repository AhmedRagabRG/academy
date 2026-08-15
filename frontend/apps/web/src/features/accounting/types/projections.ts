import type { Money } from "@/shared/utils/money"
import type {
  ExpenseCategoryId,
  ExpenseRequestId,
  ExpenseStatus,
  ExpenseSubCategoryId,
  CategoryStatus,
} from "./common"
import type {
  ExpenseAttachment,
  ExpenseComment,
  ExpenseRequest,
  HistoryEntry,
} from "./domain"

/** Narrow list row. Carries labels rather than ids the table would have to resolve. */
export interface ExpenseRequestSummary {
  id: ExpenseRequestId
  requestNumber: string
  requestDate: string
  branchId: string
  branchLabel: string
  requesterName: string
  categoryLabel: string
  subCategoryLabel?: string
  amount: Money
  status: ExpenseStatus
  attachmentCount: number
  updatedAt: string
  version: number
}

/** What the acting user may do to *this* request. A screen never re-derives it. */
export interface ExpenseRequestPermissions {
  view: boolean
  update: boolean
  submit: boolean
  review: boolean
  decide: boolean
  markPaid: boolean
  cancel: boolean
  manageAttachments: boolean
  addComment: boolean
  viewHistory: boolean
}

export interface ExpenseRequestDerived {
  isEditable: boolean
  /** From the policy table, already filtered by the actor's permissions. */
  availableTransitions: ExpenseStatus[]
  attachmentCount: number
}

export interface ExpenseRequestDetail extends ExpenseRequest {
  branchLabel: string
  /** Resolved for display, **including archived ones** (research R7). */
  categoryLabel: string
  categoryStatus: CategoryStatus
  subCategoryLabel?: string
  subCategoryStatus?: CategoryStatus
  attachments: ExpenseAttachment[]
  history: HistoryEntry[]
  comments: ExpenseComment[]
  derived: ExpenseRequestDerived
  permissions: ExpenseRequestPermissions
}

export interface ExpenseCategorySummary {
  id: ExpenseCategoryId
  name: string
  description: string
  status: CategoryStatus
  subCategoryCount: number
  updatedAt: string
  version: number
}

export interface ExpenseSubCategorySummary {
  id: ExpenseSubCategoryId
  categoryId: ExpenseCategoryId
  categoryLabel: string
  name: string
  description: string
  status: CategoryStatus
  updatedAt: string
  version: number
}

export interface AccountingAreaPermissions {
  view: boolean
  dashboardView: boolean
  requestsView: boolean
  requestsCreate: boolean
  requestsUpdate: boolean
  requestsSubmit: boolean
  requestsReview: boolean
  requestsDecide: boolean
  requestsMarkPaid: boolean
  requestsCancel: boolean
  attachmentsManage: boolean
  commentsAdd: boolean
  categoriesView: boolean
  categoriesManage: boolean
  historyView: boolean
  export: boolean
}

export interface ExpenseBreakdownRow {
  key: string
  label: string
  total: Money
  count: number
}

export interface AccountingDashboard {
  counts: {
    pending: number
    approved: number
    rejected: number
    paid: number
  }
  monthlyTotal: Money
  byBranch: ExpenseBreakdownRow[]
  byCategory: ExpenseBreakdownRow[]
  recent: ExpenseRequestSummary[]
  /** A fact, distinct from zeroes (spec FR-045). */
  hasNoRecords: boolean
  asOf: string
  permissions: AccountingAreaPermissions
}

/**
 * Settled facts and identities only, for a future Reporting or Audit module.
 * No requester name, no description, no attachment metadata.
 */
export interface AccountingExportContext {
  requests: {
    id: ExpenseRequestId
    requestNumber: string
    requestDate: string
    branchId: string
    categoryId: ExpenseCategoryId
    subCategoryId?: ExpenseSubCategoryId
    amount: Money
    status: ExpenseStatus
    decidedAt?: string
    paidAt?: string
  }[]
  asOf: string
  currency: string
  precision: number
}

export interface ExportRow {
  requestNumber: string
  requestDate: string
  branchLabel: string
  requesterName: string
  categoryLabel: string
  subCategoryLabel: string
  amount: string
  status: string
}
