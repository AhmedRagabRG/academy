import { makeMoney, type Money } from "@/shared/utils/money"
import type { PageMeta } from "@/shared/api"
import { accountingPermissions } from "../config/accounting-permissions"
import type {
  ActorRef,
  AttachmentId,
  CategoryStatus,
  CommentId,
  ExpenseCategoryId,
  ExpenseRequestId,
  ExpenseStatus,
  ExpenseSubCategoryId,
  HistoryAction,
  HistoryEntryId,
  Paginated,
} from "../types/common"
import type {
  ApprovalDecision,
  ExpenseAttachment,
  ExpenseComment,
  ExpenseRequest,
  HistoryEntry,
} from "../types/domain"
import type {
  AccountingAreaPermissions,
  ExpenseCategorySummary,
  ExpenseRequestDetail,
  ExpenseRequestPermissions,
  ExpenseRequestSummary,
  ExpenseSubCategorySummary,
} from "../types/projections"
import type { ExpenseRequestListQuery } from "../types/commands"

/**
 * The wire ⇄ domain translation for Accounting.
 *
 * Kept apart from the HTTP service so the shapes the API actually sends are
 * described in one place. The two models are not the same shape and this file
 * is where every difference is named rather than being rediscovered at each
 * call site.
 */

// ── Wire shapes ─────────────────────────────────────────────────────────────

/**
 * Per-request authority, as the API computes it.
 *
 * These mirror the endpoint guards, so they — not the local transition table —
 * decide which controls a screen offers. Re-deriving authority in the client
 * would offer buttons the API then rejects.
 */
export interface ApiExpensePermissions {
  canEdit: boolean
  canSubmit: boolean
  canReview: boolean
  canApprove: boolean
  canReject: boolean
  canReturn: boolean
  canMarkPaid: boolean
  canArchive: boolean
  canComment: boolean
}

export interface ApiActor {
  id: string
  name: string
}

export interface ApiExpenseSummary {
  id: string
  expenseNumber: string
  branchId: string
  categoryId: string
  subcategoryId: string | null
  requestedById: string
  expenseDate: string
  description: string
  amount: string
  currency: string
  status: string
  isArchived: boolean
  version: number
  createdAt: string
  updatedAt: string
  permissions: ApiExpensePermissions
  /** Reported on list reads only; the command responses leave it absent. */
  attachmentCount?: number
}

export interface ApiAttachment {
  id: string
  fileName: string
  mimeType: string
  fileSize: number
  uploadedAt: string
  uploadedBy: ApiActor
  previewUrl?: string
}

export interface ApiComment {
  id: string
  expenseRequestId: string
  body: string
  author: ApiActor
  createdAt: string
}

export interface ApiApprovalHistory {
  id: string
  action: string
  previousStatus?: string
  newStatus: string
  performedBy: ApiActor
  performedAt: string
  comment?: string
}

/** Only `GET /expenses/{id}` returns this; every command returns the summary. */
export interface ApiExpenseDetail extends ApiExpenseSummary {
  precision: number
  attachments?: ApiAttachment[]
  approvalHistory?: ApiApprovalHistory[]
}

/** A row of a Settings lookup group — what backs categories and sub-categories. */
export interface ApiLookupValue {
  id: string
  parentValueId: string | null
  name: string
  code: string
  description: string | null
  sortOrder: number
  status: string
  version: number
  createdAt: string
  updatedAt: string
}

export interface ApiBranch {
  id: string
  name: string
  status: string
}

export interface ApiUser {
  id: string
  displayName: string
  status: string
}

// ── Status and action vocabularies ──────────────────────────────────────────

/**
 * The API's TitleCase statuses against the module's own.
 *
 * `Archived` maps onto `cancelled` because they are the same terminal cell in
 * two vocabularies — the API's archive route is the one guarded by
 * `accounting.requests.cancel`. They are not perfect synonyms: the API archives
 * a *settled* request, while this module's `cancelled` abandons an unsettled
 * one. Nothing here papers over that, because whether the action is offered
 * comes from the API's own `canArchive` flag rather than from this table.
 */
const STATUS_FROM_WIRE: Record<string, ExpenseStatus> = {
  Draft: "draft",
  Submitted: "submitted",
  UnderReview: "under-review",
  Returned: "returned-for-revision",
  Approved: "approved",
  Rejected: "rejected",
  Paid: "paid",
  Archived: "cancelled",
}

const STATUS_TO_WIRE: Partial<Record<ExpenseStatus, string>> = {
  draft: "Draft",
  submitted: "Submitted",
  "under-review": "UnderReview",
  "returned-for-revision": "Returned",
  approved: "Approved",
  rejected: "Rejected",
  paid: "Paid",
  cancelled: "Archived",
}

export const toExpenseStatus = (wire: string): ExpenseStatus =>
  STATUS_FROM_WIRE[wire] ?? "draft"

export const toWireStatus = (status: ExpenseStatus): string | undefined =>
  STATUS_TO_WIRE[status]

const ACTION_FROM_WIRE: Record<string, HistoryAction> = {
  CREATE: "created",
  SUBMIT: "submitted",
  REVIEW: "review-started",
  APPROVE: "approved",
  REJECT: "rejected",
  RETURN: "returned",
  PAY: "paid",
  ARCHIVE: "cancelled",
}

// ── Directory ───────────────────────────────────────────────────────────────

/**
 * The labels a row needs but the expense endpoints do not carry.
 *
 * An expense arrives with ids only — `branchId`, `categoryId`, `requestedById`
 * — while every projection is defined in terms of labels. The directory is
 * assembled once from Settings and passed in, so mapping stays synchronous and
 * a list of fifty rows costs no extra requests.
 */
export interface AccountingDirectory {
  branchLabel(branchId: string): string
  categoryLabel(categoryId: string): string
  categoryStatus(categoryId: string): CategoryStatus | undefined
  subCategoryLabel(subCategoryId: string): string | undefined
  subCategoryStatus(subCategoryId: string): CategoryStatus | undefined
  requesterName(accountId: string): string
  currency: string
  precision: number
}

/** Lookup rows carry `active`/`inactive`/`archived`; the module has two states. */
export const toCategoryStatus = (status: string): CategoryStatus =>
  status.toLowerCase() === "active" ? "active" : "archived"

// ── Value mapping ───────────────────────────────────────────────────────────

const toActor = (actor: ApiActor): ActorRef => ({
  id: actor.id,
  name: actor.name,
  // The API denormalizes the acting name onto the row and says nothing about
  // whether that account still exists, so liveness is not claimed here.
  active: true,
})

const toMoney = (
  amount: string,
  currency: string,
  precision: number
): Money => makeMoney(amount, currency, precision)

/** Dates arrive as full timestamps; the module's dates are calendar days. */
const toCalendarDate = (value: string): string => value.slice(0, 10)

export function toAttachment(
  attachment: ApiAttachment,
  requestId: string
): ExpenseAttachment {
  return {
    id: attachment.id as AttachmentId,
    requestId: requestId as ExpenseRequestId,
    // The API stores no attachment kind. Every upload is recorded under the
    // one neutral kind rather than guessing a classification from a filename.
    kind: "supporting-document",
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    sizeBytes: attachment.fileSize,
    // The idempotency key is write-only: the API accepts it and never echoes
    // it, so a mapped attachment cannot claim to know which attempt made it.
    uploadAttempt: "",
    uploadedBy: toActor(attachment.uploadedBy),
    uploadedAt: attachment.uploadedAt,
    previewUrl: attachment.previewUrl,
  }
}

export function toComment(row: ApiComment): ExpenseComment {
  return {
    id: row.id as CommentId,
    requestId: row.expenseRequestId as ExpenseRequestId,
    body: row.body,
    author: toActor(row.author),
    createdAt: row.createdAt,
  }
}

export function toHistoryEntry(
  entry: ApiApprovalHistory,
  requestId: string,
  sequence: number
): HistoryEntry {
  const action = ACTION_FROM_WIRE[entry.action] ?? "created"
  const fromStatus = entry.previousStatus
    ? toExpenseStatus(entry.previousStatus)
    : null
  return {
    id: entry.id as HistoryEntryId,
    requestId: requestId as ExpenseRequestId,
    // A submission out of `returned-for-revision` is a resubmission; the API
    // spells both `SUBMIT` and only the previous status tells them apart.
    action:
      action === "submitted" && fromStatus === "returned-for-revision"
        ? "resubmitted"
        : action,
    fromStatus,
    toStatus: toExpenseStatus(entry.newStatus),
    performedBy: toActor(entry.performedBy),
    occurredAt: entry.performedAt,
    sequence,
    note: entry.comment,
  }
}

function sortedHistory(
  entries: ApiApprovalHistory[],
  requestId: string
): HistoryEntry[] {
  return [...entries]
    .sort((left, right) => left.performedAt.localeCompare(right.performedAt))
    .map((entry, index) => toHistoryEntry(entry, requestId, index + 1))
}

/** The decision a request currently carries, read back off its history. */
function latestDecision(history: HistoryEntry[]): ApprovalDecision | undefined {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const entry = history[index]!
    const decision =
      entry.action === "approved"
        ? "approved"
        : entry.action === "rejected"
          ? "rejected"
          : entry.action === "returned"
            ? "returned"
            : undefined
    if (decision)
      return {
        decision,
        note: entry.note,
        decidedAt: entry.occurredAt,
        decidedBy: entry.performedBy,
      }
  }
  return undefined
}

export function toRequestSummary(
  row: ApiExpenseSummary,
  directory: AccountingDirectory
): ExpenseRequestSummary {
  return {
    id: row.id as ExpenseRequestId,
    requestNumber: row.expenseNumber,
    requestDate: toCalendarDate(row.expenseDate),
    branchId: row.branchId,
    branchLabel: directory.branchLabel(row.branchId),
    requesterName: directory.requesterName(row.requestedById),
    categoryLabel: directory.categoryLabel(row.categoryId),
    subCategoryLabel: row.subcategoryId
      ? directory.subCategoryLabel(row.subcategoryId)
      : undefined,
    // The list rows omit `precision`; the organization's own is the only
    // figure available and is what the API stored the amount with.
    amount: toMoney(row.amount, row.currency, directory.precision),
    status: toExpenseStatus(row.status),
    attachmentCount: row.attachmentCount ?? 0,
    updatedAt: row.updatedAt,
    version: row.version,
  }
}

/**
 * Area-wide authority, from the session's permission keys.
 *
 * Every key this module defines exists in the API's catalogue, so the two
 * vocabularies agree and no translation is needed.
 */
export function toAreaPermissions(
  permissionKeys: readonly string[]
): AccountingAreaPermissions {
  const can = (permission: string) => permissionKeys.includes(permission)
  return {
    view: can(accountingPermissions.view),
    dashboardView: can(accountingPermissions.dashboardView),
    requestsView: can(accountingPermissions.requestsView),
    requestsCreate: can(accountingPermissions.requestsCreate),
    requestsUpdate: can(accountingPermissions.requestsUpdate),
    requestsSubmit: can(accountingPermissions.requestsSubmit),
    requestsReview: can(accountingPermissions.requestsReview),
    requestsDecide: can(accountingPermissions.requestsDecide),
    requestsMarkPaid: can(accountingPermissions.requestsMarkPaid),
    requestsCancel: can(accountingPermissions.requestsCancel),
    attachmentsManage: can(accountingPermissions.attachmentsManage),
    commentsAdd: can(accountingPermissions.commentsAdd),
    categoriesView: can(accountingPermissions.categoriesView),
    categoriesManage: can(accountingPermissions.categoriesManage),
    historyView: can(accountingPermissions.historyView),
    export: can(accountingPermissions.export),
  }
}

/**
 * What the acting user may do to *this* request.
 *
 * Taken from the API's flags rather than re-derived from the status, so a
 * control appears exactly when the API would accept it.
 */
export function toRequestPermissions(
  row: ApiExpenseSummary,
  permissionKeys: readonly string[]
): ExpenseRequestPermissions {
  const can = (permission: string) => permissionKeys.includes(permission)
  const flags = row.permissions
  return {
    view: can(accountingPermissions.requestsView),
    update: flags.canEdit,
    submit: flags.canSubmit,
    review: flags.canReview,
    decide: flags.canApprove || flags.canReject || flags.canReturn,
    markPaid: flags.canMarkPaid,
    cancel: flags.canArchive,
    manageAttachments: flags.canEdit && can(accountingPermissions.attachmentsManage),
    addComment: flags.canComment,
    viewHistory: can(accountingPermissions.historyView),
  }
}

/** The transitions the API would currently accept, from the same flags. */
function availableTransitions(row: ApiExpenseSummary): ExpenseStatus[] {
  const flags = row.permissions
  const transitions: ExpenseStatus[] = []
  if (flags.canSubmit) transitions.push("submitted")
  if (flags.canReview) transitions.push("under-review")
  if (flags.canApprove) transitions.push("approved")
  if (flags.canReject) transitions.push("rejected")
  if (flags.canReturn) transitions.push("returned-for-revision")
  if (flags.canMarkPaid) transitions.push("paid")
  if (flags.canArchive) transitions.push("cancelled")
  return transitions
}

function toBaseRequest(
  row: ApiExpenseDetail,
  directory: AccountingDirectory,
  history: HistoryEntry[],
  organizationId: string
): ExpenseRequest {
  const created = history.find((entry) => entry.action === "created")
  const last = history.at(-1)
  const requestedBy: ActorRef = created?.performedBy ?? {
    id: row.requestedById,
    name: directory.requesterName(row.requestedById),
    active: true,
  }
  const status = toExpenseStatus(row.status)
  const cancelled = [...history]
    .reverse()
    .find((entry) => entry.action === "cancelled")

  return {
    id: row.id as ExpenseRequestId,
    // Not carried on the expense itself; the caller supplies the acting scope.
    organizationId,
    requestNumber: row.expenseNumber,
    requestDate: toCalendarDate(row.expenseDate),
    branchId: row.branchId,
    requestedBy,
    categoryId: row.categoryId as ExpenseCategoryId,
    subCategoryId: (row.subcategoryId ?? undefined) as
      | ExpenseSubCategoryId
      | undefined,
    description: row.description,
    amount: toMoney(row.amount, row.currency, row.precision ?? directory.precision),
    status,
    // Only meaningful while the request is actually under review — the API
    // records a REVIEW entry on the way past it, which is not a live claim.
    reviewer:
      status === "under-review"
        ? [...history].reverse().find((entry) => entry.action === "review-started")
            ?.performedBy
        : undefined,
    decision: latestDecision(history),
    cancelReason: cancelled?.note,
    // The API has no paid state, so nothing can carry a payment timestamp.
    paidAt: undefined,
    createdAt: row.createdAt,
    createdBy: created?.performedBy ?? requestedBy,
    updatedAt: row.updatedAt,
    updatedBy: last?.performedBy ?? requestedBy,
    version: row.version,
  }
}

export function toRequestDetail(
  row: ApiExpenseDetail,
  directory: AccountingDirectory,
  permissionKeys: readonly string[],
  organizationId: string
): ExpenseRequestDetail {
  const history = sortedHistory(row.approvalHistory ?? [], row.id)
  const attachments = (row.attachments ?? []).map((attachment) =>
    toAttachment(attachment, row.id)
  )
  const subCategoryId = row.subcategoryId ?? undefined

  return {
    ...toBaseRequest(row, directory, history, organizationId),
    branchLabel: directory.branchLabel(row.branchId),
    // Resolved for display, so an archived category still names itself on a
    // request that references it.
    categoryLabel: directory.categoryLabel(row.categoryId),
    categoryStatus: directory.categoryStatus(row.categoryId) ?? "archived",
    subCategoryLabel: subCategoryId
      ? directory.subCategoryLabel(subCategoryId)
      : undefined,
    subCategoryStatus: subCategoryId
      ? directory.subCategoryStatus(subCategoryId)
      : undefined,
    attachments,
    history,
    // The API stores no discussion thread, only the audit trail above.
    comments: [],
    derived: {
      isEditable: row.permissions.canEdit,
      availableTransitions: availableTransitions(row),
      attachmentCount: attachments.length,
    },
    permissions: toRequestPermissions(row, permissionKeys),
  }
}

// ── Categories ──────────────────────────────────────────────────────────────

export function toCategorySummary(
  row: ApiLookupValue,
  subCategoryCount: number
): ExpenseCategorySummary {
  return {
    id: row.id as ExpenseCategoryId,
    name: row.name,
    description: row.description ?? "",
    status: toCategoryStatus(row.status),
    subCategoryCount,
    updatedAt: row.updatedAt,
    version: row.version,
  }
}

export function toSubCategorySummary(
  row: ApiLookupValue,
  categoryLabel: string
): ExpenseSubCategorySummary {
  return {
    id: row.id as ExpenseSubCategoryId,
    categoryId: (row.parentValueId ?? "") as ExpenseCategoryId,
    categoryLabel,
    name: row.name,
    description: row.description ?? "",
    status: toCategoryStatus(row.status),
    updatedAt: row.updatedAt,
    version: row.version,
  }
}

// ── Queries ─────────────────────────────────────────────────────────────────

const SORT_FIELD_TO_WIRE: Record<
  NonNullable<ExpenseRequestListQuery["sort"]>["field"],
  string
> = {
  requestDate: "expenseDate",
  amount: "amount",
  requestNumber: "createdAt",
  updatedAt: "createdAt",
}

/**
 * The list query, in the shape the API parses.
 *
 * The API filters by a *single* status, category, sub-category, branch and
 * requester where this module filters by sets. A one-element set is passed
 * through; anything wider is dropped here and applied to the returned page by
 * the caller, so a multi-select never silently narrows to its first value.
 */
export function toRequestListParams(query: ExpenseRequestListQuery): {
  params: Record<string, string | number | boolean | undefined>
  /** Filters the API could not express, left for the caller to apply. */
  clientSide: {
    branchIds?: string[]
    categoryIds?: string[]
    subCategoryIds?: string[]
    requesterIds?: string[]
    statuses?: ExpenseStatus[]
  }
} {
  const single = <T>(values: readonly T[] | undefined): T | undefined =>
    values && values.length === 1 ? values[0] : undefined
  const wide = <T>(values: readonly T[] | undefined): T[] | undefined =>
    values && values.length > 1 ? [...values] : undefined

  const status = single(query.statuses)
  return {
    params: {
      page: query.page,
      pageSize: query.pageSize,
      search: query.search || undefined,
      status: status ? toWireStatus(status) : undefined,
      categoryId: single(query.categoryIds),
      subcategoryId: single(query.subCategoryIds),
      branchId: single(query.branchIds),
      requestedBy: single(query.requesterIds),
      dateFrom: query.dateRange?.from,
      dateTo: query.dateRange?.to,
      sortBy: query.sort ? SORT_FIELD_TO_WIRE[query.sort.field] : undefined,
      sortOrder: query.sort?.direction,
      // `cancelled` is the API's `Archived`, which it hides unless asked.
      includeArchived:
        query.statuses?.includes("cancelled") || status === "cancelled"
          ? true
          : undefined,
    },
    clientSide: {
      branchIds: wide(query.branchIds),
      categoryIds: wide(query.categoryIds),
      subCategoryIds: wide(query.subCategoryIds),
      requesterIds: wide(query.requesterIds),
      statuses: wide(query.statuses),
    },
  }
}

export function toPaginated<T>(items: T[], meta: PageMeta): Paginated<T> {
  return {
    items,
    total: meta.total,
    page: meta.page,
    pageSize: meta.limit,
    totalPages: meta.totalPages,
  }
}
