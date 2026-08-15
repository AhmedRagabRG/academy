import type { Money } from "@/shared/utils/money"
import type {
  ActorRef,
  AttachmentId,
  AttachmentKind,
  CategoryStatus,
  CommentId,
  DecisionKind,
  ExpenseCategoryId,
  ExpenseRequestId,
  ExpenseStatus,
  ExpenseSubCategoryId,
  HistoryAction,
  HistoryEntryId,
  LookupOption,
} from "./common"

export interface AuditContext {
  createdAt: string
  createdBy: ActorRef
  updatedAt: string
  updatedBy: ActorRef
  /** Drives optimistic concurrency on every command. */
  version: number
}

export interface ExpenseCategory extends AuditContext {
  id: ExpenseCategoryId
  organizationId: string
  /** Unique across the organization. */
  name: string
  description: string
  status: CategoryStatus
}

export interface ExpenseSubCategory extends AuditContext {
  id: ExpenseSubCategoryId
  organizationId: string
  /** Exactly one parent (spec FR-005). */
  categoryId: ExpenseCategoryId
  /** Unique within its parent. */
  name: string
  description: string
  status: CategoryStatus
}

export interface ApprovalDecision {
  decision: DecisionKind
  /** Required for `rejected` and `returned` (spec FR-023). */
  note?: string
  decidedAt: string
  /** Names the actor, so a Super Admin override is visible as one (FR-022b). */
  decidedBy: ActorRef
}

export interface ExpenseAttachment {
  id: AttachmentId
  requestId: ExpenseRequestId
  kind: AttachmentKind
  fileName: string
  mimeType: string
  sizeBytes: number
  /**
   * Client-generated idempotency key. Checked *before* the version assert, so a
   * genuine retry is a no-op rather than a conflict (research R6).
   */
  uploadAttempt: string
  uploadedBy: ActorRef
  uploadedAt: string
  /**
   * Where the stored file can be opened. Absent when the service holds no
   * bytes of its own — the in-memory implementation records metadata only, and
   * an approver is told the file is unavailable rather than shown a dead link.
   */
  previewUrl?: string
}

/**
 * A branch's request to spend.
 *
 * There is deliberately **no `approvedAmount`**. Approval is all-or-nothing on
 * the requested figure; a wrong amount is corrected by returning the request,
 * which puts the correction in the history rather than applying it silently at
 * approval (spec FR-030, FR-030a). The rule is enforced by the model having
 * nowhere to put a second figure.
 */
export interface ExpenseRequest extends AuditContext {
  id: ExpenseRequestId
  organizationId: string
  requestNumber: string
  requestDate: string
  branchId: string
  /** Denormalized, so a departed requester is still named (FR-010). */
  requestedBy: ActorRef
  categoryId: ExpenseCategoryId
  subCategoryId?: ExpenseSubCategoryId
  description: string
  amount: Money
  status: ExpenseStatus
  /** Set by `review-started`, cleared on return. */
  reviewer?: ActorRef
  decision?: ApprovalDecision
  cancelReason?: string
  paidAt?: string
}

/** Append-only. No command accepts a `HistoryEntryId` (research R4). */
export interface HistoryEntry {
  id: HistoryEntryId
  requestId: ExpenseRequestId
  action: HistoryAction
  /** `null` only for `created`. */
  fromStatus: ExpenseStatus | null
  toStatus: ExpenseStatus
  performedBy: ActorRef
  occurredAt: string
  /** Monotonic tiebreak for entries sharing a timestamp. */
  sequence: number
  note?: string
}

/**
 * Discussion, kept separate from the history so nothing a commenter writes can
 * dilute the audit record (spec FR-037).
 */
export interface ExpenseComment {
  id: CommentId
  requestId: ExpenseRequestId
  body: string
  author: ActorRef
  createdAt: string
}

export interface NumberingPolicy {
  prefix: string
  yearSegment: string
  padding: number
}

export interface AttachmentPolicy {
  acceptedMimeTypes: string[]
  maxBytes: number
}

export interface AccountingConfiguration {
  numbering: NumberingPolicy
  attachments: AttachmentPolicy
  currency: string
  precision: number
  /** Read from Organization & Settings; this module creates no branches. */
  branches: LookupOption[]
}
