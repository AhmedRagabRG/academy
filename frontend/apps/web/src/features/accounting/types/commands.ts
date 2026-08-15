import type {
  AttachmentId,
  AttachmentKind,
  CategoryStatus,
  DateRange,
  DecisionKind,
  ExpenseCategoryId,
  ExpenseRequestId,
  ExpenseStatus,
  ExpenseSubCategoryId,
} from "./common"

// ── List queries ────────────────────────────────────────────────────────────

export interface ExpenseRequestListQuery {
  search?: string
  branchIds?: string[]
  categoryIds?: ExpenseCategoryId[]
  subCategoryIds?: ExpenseSubCategoryId[]
  requesterIds?: string[]
  statuses?: ExpenseStatus[]
  dateRange?: DateRange & { field: "requestDate" }
  sort?: {
    field: "requestDate" | "amount" | "requestNumber" | "updatedAt"
    direction: "asc" | "desc"
  }
  page: number
  pageSize: number
}

export interface CategoryListQuery {
  search?: string
  statuses?: CategoryStatus[]
  /** Pickers pass true; display reads resolve archived rows too (research R7). */
  activeOnly?: boolean
  page: number
  pageSize: number
}

export interface SubCategoryListQuery extends CategoryListQuery {
  categoryIds?: ExpenseCategoryId[]
}

export interface DashboardQuery {
  branchIds?: string[]
  /** ISO month, e.g. "2026-08". Defaults to the injected clock's month. */
  month?: string
}

// ── Request commands ────────────────────────────────────────────────────────

export interface ExpenseRequestInput {
  requestDate: string
  branchId: string
  categoryId: ExpenseCategoryId
  subCategoryId?: ExpenseSubCategoryId
  description: string
  /** A decimal string. A number would let a float touch money. */
  amount: string
}

export interface CreateRequestCommand {
  input: ExpenseRequestInput
}

export interface UpdateRequestCommand {
  requestId: ExpenseRequestId
  input: ExpenseRequestInput
  expectedVersion: number
}

export interface SubmitRequestCommand {
  requestId: ExpenseRequestId
  expectedVersion: number
}

export interface StartReviewCommand {
  requestId: ExpenseRequestId
  expectedVersion: number
}

export interface DecideRequestCommand {
  requestId: ExpenseRequestId
  decision: DecisionKind
  note?: string
  expectedVersion: number
}

export interface MarkPaidCommand {
  requestId: ExpenseRequestId
  expectedVersion: number
}

export interface CancelRequestCommand {
  requestId: ExpenseRequestId
  reason: string
  expectedVersion: number
}

// ── Attachment commands ─────────────────────────────────────────────────────

export interface UploadAttachmentCommand {
  requestId: ExpenseRequestId
  kind: AttachmentKind
  fileName: string
  mimeType: string
  sizeBytes: number
  /** Idempotency key: a retry with the same value must not duplicate (FR-020). */
  uploadAttempt: string
  expectedVersion: number
}

export interface RemoveAttachmentCommand {
  requestId: ExpenseRequestId
  attachmentId: AttachmentId
  expectedVersion: number
}

// ── Comment command ─────────────────────────────────────────────────────────

export interface AddCommentCommand {
  requestId: ExpenseRequestId
  body: string
}

// ── Category commands ───────────────────────────────────────────────────────

export interface CategoryInput {
  name: string
  description: string
}

export interface CreateCategoryCommand {
  input: CategoryInput
}

export interface UpdateCategoryCommand {
  categoryId: ExpenseCategoryId
  input: CategoryInput
  expectedVersion: number
}

export interface SetCategoryStatusCommand {
  categoryId: ExpenseCategoryId
  status: CategoryStatus
  expectedVersion: number
}

export interface CreateSubCategoryCommand {
  categoryId: ExpenseCategoryId
  input: CategoryInput
}

export interface UpdateSubCategoryCommand {
  subCategoryId: ExpenseSubCategoryId
  input: CategoryInput
  expectedVersion: number
}

export interface SetSubCategoryStatusCommand {
  subCategoryId: ExpenseSubCategoryId
  status: CategoryStatus
  expectedVersion: number
}
