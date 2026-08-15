/**
 * Branded identifiers.
 *
 * Opaque at the type level, so a category id can never be passed where a request
 * id belongs — a mistake that is otherwise invisible until runtime because both
 * are strings.
 */
declare const brand: unique symbol

type Branded<T, B extends string> = T & { readonly [brand]: B }

export type ExpenseRequestId = Branded<string, "ExpenseRequestId">
export type ExpenseCategoryId = Branded<string, "ExpenseCategoryId">
export type ExpenseSubCategoryId = Branded<string, "ExpenseSubCategoryId">
export type AttachmentId = Branded<string, "AttachmentId">
export type HistoryEntryId = Branded<string, "HistoryEntryId">
export type CommentId = Branded<string, "CommentId">

/** The eight-state lifecycle (spec FR-021). */
export type ExpenseStatus =
  | "draft"
  | "submitted"
  | "under-review"
  | "returned-for-revision"
  | "approved"
  | "rejected"
  | "paid"
  | "cancelled"

/**
 * Named after what happened rather than the resulting state: `returned` and
 * `resubmitted` are different events even though a resubmission leaves the same
 * status a submission does.
 */
export type HistoryAction =
  | "created"
  | "submitted"
  | "review-started"
  | "returned"
  | "resubmitted"
  | "approved"
  | "rejected"
  | "paid"
  | "cancelled"

export type AttachmentKind = "invoice" | "receipt" | "supporting-document"

export type CategoryStatus = "active" | "archived"

export type DecisionKind = "approved" | "rejected" | "returned"

export interface ActorRef {
  id: string
  name: string
  active: boolean
}

export interface LookupOption {
  value: string
  label: string
}

export interface DateRange {
  from?: string
  to?: string
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
