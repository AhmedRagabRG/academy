import { makeMoney } from "@/shared/utils/money"
import {
  clampPage,
  isInvertedRange,
  isWithinRange,
  normalizeSearchTerm,
} from "@/shared/utils/list-query"
import { sum, toMinor } from "@/shared/utils/money"
import type {
  ActorRef,
  AttachmentId,
  CommentId,
  ExpenseCategoryId,
  ExpenseSubCategoryId,
  ExpenseRequestId,
  ExpenseStatus,
  HistoryAction,
  HistoryEntryId,
} from "../types/common"
import type {
  ExpenseAttachment,
  ExpenseCategory,
  ExpenseComment,
  ExpenseRequest,
  ExpenseSubCategory,
  HistoryEntry,
} from "../types/domain"
import type { AccountingService } from "./accounting-service"
import type { CategoryInput, ExpenseRequestInput } from "../types/commands"
import type {
  AccountingAreaPermissions,
  ExpenseCategorySummary,
  ExpenseRequestDetail,
  ExpenseRequestSummary,
  ExpenseRequestPermissions,
  ExpenseSubCategorySummary,
} from "../types/projections"
import { AccountingError } from "./accounting-error"
import { accountingPermissions } from "../config/accounting-permissions"
import {
  createAccountingStore,
  type AccountingStore,
} from "../data/accounting-fixtures"
import { attachmentPolicy, numberingPolicy } from "../data/accounting-lookups"
import {
  hasPermission,
  isInScope,
  type AccountingServiceContext,
} from "../utils/accounting-scope"
import {
  actionFor,
  allowedTransitions,
  isEditable,
  transitionRule,
} from "../utils/expense-lifecycle"
import { nextSequence, sortHistory } from "../utils/accounting-history"
import { formatRequestNumber } from "../utils/accounting-numbering"
import { validateAttachment } from "../utils/attachment-rules"
import { createExpenseRequestSchema } from "../schemas/expense-request-schemas"
import { categorySchema, normalizeName } from "../schemas/category-schemas"
import { normalizeRequestListQuery } from "../utils/accounting-list-query"
import {
  accountingScenarios,
  scenarioContext,
  scenarioDelay,
  shouldFail,
  type AccountingFailureArea,
} from "./mock-scenario-controller"
import {
  organizationDirectoryReader,
  primeBranchLabels,
} from "./accounting-dependency-adapters"

let store: AccountingStore = createAccountingStore()
let idCounter = 0

/**
 * Seeds the id counter past every id the fixtures already used.
 *
 * Without this a newly created `request-1` collides with a seeded `request-1`
 * and silently inherits its history and attachments — the two records become one.
 */
function seedIdCounter(current: AccountingStore): number {
  const suffixOf = (id: string) => Number(id.split("-").at(-1))
  const ids = [
    ...current.requests.map((row) => row.id),
    ...current.categories.map((row) => row.id),
    ...current.subCategories.map((row) => row.id),
    ...current.attachments.map((row) => row.id),
    ...current.history.map((row) => row.id),
    ...current.comments.map((row) => row.id),
  ]
  return ids.reduce((highest, id) => {
    const suffix = suffixOf(id)
    return Number.isFinite(suffix) ? Math.max(highest, suffix) : highest
  }, 0)
}

idCounter = seedIdCounter(store)

const nextId = (prefix: string) => `${prefix}-${(idCounter += 1)}`
const clone = <T>(value: T): T => structuredClone(value)

/**
 * Per-entity lazy indexes, invalidated on every write.
 *
 * `requestById` and `categoryById` exist specifically so no list ever calls
 * `.find()` inside a `filter` — the shape that made an equivalent Student Finance
 * queue O(n²) at scale (research R11).
 */
let requestById: Map<string, ExpenseRequest> | null = null
let categoryById: Map<string, ExpenseCategory> | null = null
let subCategoryById: Map<string, ExpenseSubCategory> | null = null
let subCategoriesByCategory: Map<string, ExpenseSubCategory[]> | null = null
let attachmentsByRequest: Map<string, ExpenseAttachment[]> | null = null
let historyByRequest: Map<string, HistoryEntry[]> | null = null
let commentsByRequest: Map<string, ExpenseComment[]> | null = null

function invalidateIndexes(): void {
  requestById = null
  categoryById = null
  subCategoryById = null
  subCategoriesByCategory = null
  attachmentsByRequest = null
  historyByRequest = null
  commentsByRequest = null
}

function groupBy<T>(rows: readonly T[], key: (row: T) => string): Map<string, T[]> {
  const index = new Map<string, T[]>()
  for (const row of rows) {
    const bucket = index.get(key(row))
    if (bucket) bucket.push(row)
    else index.set(key(row), [row])
  }
  return index
}

const requestOf = (requestId: string): ExpenseRequest | undefined => {
  requestById ??= new Map(store.requests.map((row) => [row.id, row]))
  return requestById.get(requestId)
}
const categoryOf = (categoryId: string): ExpenseCategory | undefined => {
  categoryById ??= new Map(store.categories.map((row) => [row.id, row]))
  return categoryById.get(categoryId)
}
const subCategoryOf = (id: string): ExpenseSubCategory | undefined => {
  subCategoryById ??= new Map(store.subCategories.map((row) => [row.id, row]))
  return subCategoryById.get(id)
}
const subCategoriesOf = (categoryId: string): ExpenseSubCategory[] => {
  subCategoriesByCategory ??= groupBy(store.subCategories, (row) => row.categoryId)
  return subCategoriesByCategory.get(categoryId) ?? []
}
const attachmentsOf = (requestId: string): ExpenseAttachment[] => {
  attachmentsByRequest ??= groupBy(store.attachments, (row) => row.requestId)
  return attachmentsByRequest.get(requestId) ?? []
}
const historyOf = (requestId: string): HistoryEntry[] => {
  historyByRequest ??= groupBy(store.history, (row) => row.requestId)
  return historyByRequest.get(requestId) ?? []
}
const commentsOf = (requestId: string): ExpenseComment[] => {
  commentsByRequest ??= groupBy(store.comments, (row) => row.requestId)
  return commentsByRequest.get(requestId) ?? []
}

/** Rebuilds the deterministic store; used by tests between cases. */
export function resetAccountingStore(): void {
  store = createAccountingStore()
  idCounter = seedIdCounter(store)
  invalidateIndexes()
  accountingScenarios.reset()
}

// ── Guards ──────────────────────────────────────────────────────────────────

/** Every operation checks its exact permission key (spec FR-046). */
function require(context: AccountingServiceContext, permission: string): void {
  if (!hasPermission(context, permission)) throw new AccountingError("forbidden")
}

function findRequest(
  requestId: ExpenseRequestId,
  context: AccountingServiceContext
): ExpenseRequest {
  const request = requestOf(requestId)
  if (!request) throw new AccountingError("not-found")
  // A refusal, never an empty result (spec FR-048).
  if (!isInScope(request, context)) throw new AccountingError("out-of-scope")
  return request
}

function assertVersion(record: { version: number }, expectedVersion: number): void {
  if (accountingScenarios.read().forceConflict) {
    accountingScenarios.setConflict(false)
    throw new AccountingError("version-conflict", {
      currentVersion: record.version,
    })
  }
  if (record.version !== expectedVersion)
    throw new AccountingError("version-conflict", {
      currentVersion: record.version,
    })
}

async function guard(area: Exclude<AccountingFailureArea, "none" | "all">) {
  await scenarioDelay()
  await primeBranchLabels()
  if (shouldFail(area)) throw new AccountingError("validation-failed")
}

function touch(record: { updatedAt: string; updatedBy: ActorRef; version: number }, context: AccountingServiceContext): void {
  record.updatedAt = context.now()
  record.updatedBy = context.actor
  record.version += 1
}

/**
 * The **single** writer of history.
 *
 * Called inside the same operation as the transition it records — never as a
 * separate step that could be skipped or fail independently. Nothing else in this
 * module pushes to `store.history`, and the service exposes no way to change an
 * entry once written (research R4).
 */
function appendHistory(input: {
  request: ExpenseRequest
  action: HistoryAction
  fromStatus: ExpenseStatus | null
  toStatus: ExpenseStatus
  context: AccountingServiceContext
  note?: string
}): void {
  const existing = historyOf(input.request.id)
  store.history.push({
    id: nextId("history") as HistoryEntryId,
    requestId: input.request.id,
    action: input.action,
    fromStatus: input.fromStatus,
    toStatus: input.toStatus,
    performedBy: input.context.actor,
    occurredAt: input.context.now(),
    sequence: nextSequence(existing),
    note: input.note?.trim() || undefined,
  })
  invalidateIndexes()
}

/**
 * Evaluates a transition against the policy table and performs it.
 *
 * The order is deliberate: **authority, then legality, then concurrency, then the
 * note**. A user who may not act should be told exactly that, not handed a version
 * conflict implying they otherwise could.
 */
function transition(input: {
  request: ExpenseRequest
  to: ExpenseStatus
  context: AccountingServiceContext
  expectedVersion: number
  note?: string
}): void {
  const { request, to, context, expectedVersion, note } = input
  const rule = transitionRule(request.status, to)

  if (!rule) {
    // The transition is illegal *from the status the record holds now*. If the
    // caller's view is stale, that staleness is the real explanation — someone
    // else already acted — and saying so is far more useful than telling them the
    // action was never available. This is the losing side of a decision race.
    assertVersion(request, expectedVersion)
    throw new AccountingError("invalid-transition", {
      from: request.status,
      to,
    })
  }

  // Authority before concurrency: a user who may not act should be told exactly
  // that, not handed a version conflict implying they otherwise could.
  require(context, rule.permission)
  assertVersion(request, expectedVersion)
  if (rule.reasonRequired && !note?.trim())
    throw new AccountingError("note-required")

  const from = request.status
  request.status = to
  touch(request, context)
  appendHistory({
    request,
    action: actionFor(from, to) ?? "submitted",
    fromStatus: from,
    toStatus: to,
    context,
    note,
  })
  invalidateIndexes()
}

// ── Projections ─────────────────────────────────────────────────────────────

function areaPermissions(
  context: AccountingServiceContext
): AccountingAreaPermissions {
  const can = (permission: string) => hasPermission(context, permission)
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

function requestPermissions(
  request: ExpenseRequest,
  context: AccountingServiceContext
): ExpenseRequestPermissions {
  const can = (permission: string) => hasPermission(context, permission)
  const editable = isEditable(request.status)
  return {
    view: can(accountingPermissions.requestsView),
    update: editable && can(accountingPermissions.requestsUpdate),
    submit: editable && can(accountingPermissions.requestsSubmit),
    review:
      request.status === "submitted" && can(accountingPermissions.requestsReview),
    decide:
      request.status === "under-review" &&
      can(accountingPermissions.requestsDecide),
    markPaid:
      request.status === "approved" &&
      can(accountingPermissions.requestsMarkPaid),
    cancel:
      Boolean(transitionRule(request.status, "cancelled")) &&
      can(accountingPermissions.requestsCancel),
    manageAttachments: editable && can(accountingPermissions.attachmentsManage),
    addComment: can(accountingPermissions.commentsAdd),
    viewHistory: can(accountingPermissions.historyView),
  }
}

export function toRequestSummary(request: ExpenseRequest): ExpenseRequestSummary {
  const category = categoryOf(request.categoryId)
  const subCategory = request.subCategoryId
    ? subCategoryOf(request.subCategoryId)
    : undefined
  return clone({
    id: request.id,
    requestNumber: request.requestNumber,
    requestDate: request.requestDate,
    branchId: request.branchId,
    branchLabel: organizationDirectoryReader.branchLabel(request.branchId),
    requesterName: request.requestedBy.name,
    // Resolved for display, so an archived category still names itself.
    categoryLabel: category?.name ?? request.categoryId,
    subCategoryLabel: subCategory?.name,
    amount: request.amount,
    status: request.status,
    attachmentCount: attachmentsOf(request.id).length,
    updatedAt: request.updatedAt,
    version: request.version,
  })
}

export function toCategorySummary(
  category: ExpenseCategory
): ExpenseCategorySummary {
  return clone({
    id: category.id,
    name: category.name,
    description: category.description,
    status: category.status,
    subCategoryCount: subCategoriesOf(category.id).length,
    updatedAt: category.updatedAt,
    version: category.version,
  })
}

export function toSubCategorySummary(
  subCategory: ExpenseSubCategory
): ExpenseSubCategorySummary {
  return clone({
    id: subCategory.id,
    categoryId: subCategory.categoryId,
    categoryLabel: categoryOf(subCategory.categoryId)?.name ?? subCategory.categoryId,
    name: subCategory.name,
    description: subCategory.description,
    status: subCategory.status,
    updatedAt: subCategory.updatedAt,
    version: subCategory.version,
  })
}

/**
 * The whole detail page in one read, including `derived` and `permissions` so a
 * screen never re-derives authority or legality for itself.
 */
export function toRequestDetail(
  request: ExpenseRequest,
  context: AccountingServiceContext
): ExpenseRequestDetail {
  // Resolved for **display**, so an archived category still renders on a request
  // that references it (research R7).
  const category = categoryOf(request.categoryId)
  const subCategory = request.subCategoryId
    ? subCategoryOf(request.subCategoryId)
    : undefined
  const attachments = attachmentsOf(request.id)

  return clone({
    ...request,
    branchLabel: organizationDirectoryReader.branchLabel(request.branchId),
    categoryLabel: category?.name ?? request.categoryId,
    categoryStatus: category?.status ?? "archived",
    subCategoryLabel: subCategory?.name,
    subCategoryStatus: subCategory?.status,
    attachments,
    history: sortHistory(historyOf(request.id)),
    comments: [...commentsOf(request.id)].sort((left, right) =>
      left.createdAt.localeCompare(right.createdAt)
    ),
    derived: {
      isEditable: isEditable(request.status),
      availableTransitions: allowedTransitions(request.status).filter((to) => {
        const rule = transitionRule(request.status, to)
        return rule ? hasPermission(context, rule.permission) : false
      }),
      attachmentCount: attachments.length,
    },
    permissions: requestPermissions(request, context),
  })
}

// ── Category helpers ────────────────────────────────────────────────────────

function findCategory(
  categoryId: ExpenseCategoryId,
  context: AccountingServiceContext
): ExpenseCategory {
  const category = categoryOf(categoryId)
  if (!category || category.organizationId !== context.organizationId)
    throw new AccountingError("not-found")
  return category
}

function findSubCategory(
  subCategoryId: ExpenseSubCategoryId,
  context: AccountingServiceContext
): ExpenseSubCategory {
  const subCategory = subCategoryOf(subCategoryId)
  if (!subCategory || subCategory.organizationId !== context.organizationId)
    throw new AccountingError("not-found")
  return subCategory
}

function parseCategory(input: CategoryInput): CategoryInput {
  const parsed = categorySchema.safeParse(input)
  if (!parsed.success)
    throw new AccountingError(
      "validation-failed",
      { field: parsed.error.issues[0]?.path.join(".") },
      parsed.error.issues[0]?.message
    )
  return parsed.data
}

/** Unique across the organization. */
function assertCategoryNameFree(
  name: string,
  organizationId: string,
  ignoreId?: ExpenseCategoryId
): void {
  const taken = store.categories.some(
    (category) =>
      category.organizationId === organizationId &&
      category.id !== ignoreId &&
      normalizeName(category.name) === normalizeName(name)
  )
  if (taken) throw new AccountingError("duplicate-name", { name })
}

/**
 * Unique **within its parent** only: "المطبوعات" under Marketing and under Office
 * are different things, and forbidding that would push users into awkward names.
 */
function assertSubCategoryNameFree(
  name: string,
  categoryId: ExpenseCategoryId,
  ignoreId?: ExpenseSubCategoryId
): void {
  const taken = subCategoriesOf(categoryId).some(
    (subCategory) =>
      subCategory.id !== ignoreId &&
      normalizeName(subCategory.name) === normalizeName(name)
  )
  if (taken) throw new AccountingError("duplicate-name", { name })
}

// ── Service ─────────────────────────────────────────────────────────────────

function activeCategories(): ExpenseCategory[] {
  return store.categories.filter((row) => row.status === "active")
}

function activeSubCategories(): ExpenseSubCategory[] {
  return store.subCategories.filter(
    (row) =>
      row.status === "active" && categoryOf(row.categoryId)?.status === "active"
  )
}

/**
 * Validates a request's own fields against the same schema the form uses.
 *
 * Categories are passed in full — active *and* archived — so an archived one is
 * refused by name rather than reported as "does not exist".
 */
function validateInput(input: ExpenseRequestInput, context: AccountingServiceContext): void {
  const schema = createExpenseRequestSchema({
    precision: context.precision,
    categories: store.categories.map((row) => ({ id: row.id, status: row.status })),
    subCategories: store.subCategories.map((row) => ({
      id: row.id,
      categoryId: row.categoryId,
      status: row.status,
    })),
  })
  const parsed = schema.safeParse({
    requestDate: input.requestDate,
    branchId: input.branchId,
    categoryId: input.categoryId,
    subCategoryId: input.subCategoryId ?? "",
    description: input.description,
    amount: input.amount,
  })
  if (parsed.success) return

  const first = parsed.error.issues[0]!
  const path = first.path.join(".")
  if (path === "amount")
    throw new AccountingError(
      first.message.includes("صفر") ? "amount-not-positive" : "amount-invalid",
      { field: path },
      first.message
    )
  if (path === "categoryId")
    throw new AccountingError(
      first.message.includes("مؤرشف") ? "category-inactive" : "category-required",
      { field: path },
      first.message
    )
  if (path === "subCategoryId")
    throw new AccountingError("subcategory-mismatch", { field: path }, first.message)
  throw new AccountingError("validation-failed", { field: path }, first.message)
}

function applyInput(
  request: ExpenseRequest,
  input: ExpenseRequestInput,
  context: AccountingServiceContext
): void {
  request.requestDate = input.requestDate
  request.branchId = input.branchId
  request.categoryId = input.categoryId
  request.subCategoryId = input.subCategoryId
  request.description = input.description.trim()
  request.amount = makeMoney(input.amount, context.currency, context.precision)
}

export const accountingService: Pick<
  AccountingService,
  | "lookups"
  | "getRequest"
  | "listHistory"
  | "listComments"
  | "addComment"
  | "getDashboard"
  | "listRequests"
  | "exportRequests"
  | "getAccountingExportContext"
  | "listCategories"
  | "listSubCategories"
  | "resolveCategory"
  | "resolveSubCategory"
  | "createCategory"
  | "updateCategory"
  | "setCategoryStatus"
  | "createSubCategory"
  | "updateSubCategory"
  | "setSubCategoryStatus"
  | "createRequest"
  | "updateRequest"
  | "submitRequest"
  | "startReview"
  | "decideRequest"
  | "markPaid"
  | "cancelRequest"
  | "uploadAttachment"
  | "removeAttachment"
> = {
  /**
   * Everything a form needs to offer choices.
   *
   * Categories here are the **active** ones — pickers must not offer an archived
   * category. Display resolves archived ones separately (research R7).
   */
  async lookups() {
    await guard("requests")
    const context = scenarioContext()
    require(context, accountingPermissions.view)
    const branches = await organizationDirectoryReader.listBranches()

    return clone({
      numbering: numberingPolicy,
      attachments: attachmentPolicy,
      currency: context.currency,
      precision: context.precision,
      branches: branches
        .filter((branch) => branch.active)
        .map((branch) => ({ value: branch.id, label: branch.label })),
      categories: activeCategories().map(toCategorySummary),
      subCategories: activeSubCategories().map(toSubCategorySummary),
      requesters: [
        ...new Map(
          store.requests.map((request) => [
            request.requestedBy.id,
            { value: request.requestedBy.id, label: request.requestedBy.name },
          ])
        ).values(),
      ],
    })
  },

  async getRequest(requestId) {
    await guard("detail")
    const context = scenarioContext()
    require(context, accountingPermissions.requestsView)
    const request = findRequest(requestId, context)
    // A read, with no side effect: opening a request must not claim it (R2).
    return toRequestDetail(request, context)
  },

  /**
   * The request's history, chronological and deep-cloned.
   *
   * There is no counterpart that updates or deletes an entry: the service exposes
   * no such operation, and no command accepts a `HistoryEntryId` (research R4).
   */
  /**
   * Every dashboard figure is produced by the **same filter-and-count path** the
   * lists use — no separate aggregation code.
   *
   * Two code paths computing the same number will disagree eventually, and a
   * dashboard that disagrees with the list beneath it destroys trust in both
   * (research R9, SC-005).
   */
  async getDashboard(query) {
    await guard("dashboard")
    const context = scenarioContext()
    require(context, accountingPermissions.dashboardView)

    const scoped = { page: 1, pageSize: 100_000, branchIds: query.branchIds }
    const countOf = async (statuses: ExpenseStatus[]) =>
      (await this.listRequests({ ...scoped, statuses })).total

    const all = await this.listRequests(scoped)

    // "Pending" is everything still moving through the workflow.
    const [pending, approved, rejected, paid] = await Promise.all([
      countOf(["submitted", "under-review", "returned-for-revision"]),
      countOf(["approved"]),
      countOf(["rejected"]),
      countOf(["paid"]),
    ])

    const month = query.month ?? context.now().slice(0, 7)
    const monthly = await this.listRequests({
      ...scoped,
      dateRange: {
        field: "requestDate",
        from: `${month}-01`,
        to: `${month}-31`,
      },
    })

    const sumOf = (rows: ExpenseRequestSummary[]) =>
      sum(
        rows.map((row) => row.amount),
        context.currency,
        context.precision
      )

    const groupTotals = (
      rows: ExpenseRequestSummary[],
      key: (row: ExpenseRequestSummary) => { id: string; label: string }
    ) => {
      const buckets = new Map<string, { label: string; rows: ExpenseRequestSummary[] }>()
      for (const row of rows) {
        const { id, label } = key(row)
        const bucket = buckets.get(id)
        if (bucket) bucket.rows.push(row)
        else buckets.set(id, { label, rows: [row] })
      }
      return [...buckets.entries()]
        .map(([id, bucket]) => ({
          key: id,
          label: bucket.label,
          total: sumOf(bucket.rows),
          count: bucket.rows.length,
        }))
        // Integer minor units, so no float touches a money value.
        .sort((left, right) => toMinor(right.total) - toMinor(left.total))
    }

    return clone({
      counts: { pending, approved, rejected, paid },
      monthlyTotal: sumOf(monthly.items),
      byBranch: groupTotals(all.items, (row) => ({
        id: row.branchId,
        label: row.branchLabel,
      })),
      byCategory: groupTotals(all.items, (row) => ({
        id: row.categoryLabel,
        label: row.categoryLabel,
      })),
      recent: [...all.items]
        .sort((left, right) => right.requestDate.localeCompare(left.requestDate))
        .slice(0, 5),
      // A fact, distinct from zeroes: an organization with no records has not
      // spent nothing, it has recorded nothing (spec FR-045).
      hasNoRecords: all.total === 0,
      asOf: context.now(),
      permissions: areaPermissions(context),
    })
  },

  /**
   * The requests queue.
   *
   * Joins are done through the by-id indexes and sort keys are computed once per
   * row — never `.find()` inside a `filter`, never a derivation inside a
   * comparator. Both shapes were measured as real performance defects in Student
   * Finance at scale (research R11).
   */
  async listRequests(query) {
    await guard("requests")
    const context = scenarioContext()
    require(context, accountingPermissions.requestsView)
    const normalized = normalizeRequestListQuery(query)
    if (isInvertedRange(normalized.dateRange))
      throw new AccountingError("invalid-date-range")

    const search = normalized.search
    const rows = store.requests.filter((request) => {
      if (!isInScope(request, context)) return false
      if (normalized.branchIds && !normalized.branchIds.includes(request.branchId))
        return false
      if (normalized.categoryIds && !normalized.categoryIds.includes(request.categoryId))
        return false
      if (
        normalized.subCategoryIds &&
        (!request.subCategoryId ||
          !normalized.subCategoryIds.includes(request.subCategoryId))
      )
        return false
      if (
        normalized.requesterIds &&
        !normalized.requesterIds.includes(request.requestedBy.id)
      )
        return false
      if (normalized.statuses && !normalized.statuses.includes(request.status))
        return false
      if (!isWithinRange(request.requestDate, normalized.dateRange)) return false
      if (
        search &&
        ![
          request.requestNumber.toLowerCase(),
          normalizeSearchTerm(request.requestedBy.name),
          normalizeSearchTerm(request.description),
        ].some((value) => value.includes(search))
      )
        return false
      return true
    })

    const direction = normalized.sort?.direction === "asc" ? 1 : -1
    const field = normalized.sort?.field
    // Sort keys computed once per row, not inside the comparator.
    const decorated = rows.map((request) => ({
      request,
      key:
        field === "amount"
          ? toMinor(request.amount)
          : field === "requestNumber"
            ? request.requestNumber
            : field === "updatedAt"
              ? request.updatedAt
              : request.requestDate,
    }))
    decorated.sort((left, right) => {
      if (typeof left.key === "number" && typeof right.key === "number")
        return (left.key - right.key) * direction
      return String(left.key).localeCompare(String(right.key)) * direction
    })

    const page = clampPage(normalized.page, normalized.pageSize, decorated.length)
    const start = (page - 1) * normalized.pageSize
    return {
      items: decorated
        .slice(start, start + normalized.pageSize)
        .map((entry) => toRequestSummary(entry.request)),
      total: decorated.length,
      page,
      pageSize: normalized.pageSize,
      totalPages: Math.max(1, Math.ceil(decorated.length / normalized.pageSize)),
    }
  },

  /**
   * Settled facts and identities only, for a future Reporting or Audit module.
   *
   * A downstream ledger needs to know **which** request and **whose**, not who the
   * requester is or what they wrote. No name, no description, no attachment
   * metadata crosses this boundary (spec FR-048 equivalent).
   */
  async getAccountingExportContext(query) {
    await guard("requests")
    const context = scenarioContext()
    require(context, accountingPermissions.export)
    const page = await this.listRequests({ ...query, page: 1, pageSize: 100_000 })
    const byId = new Map(page.items.map((item) => [item.id, item]))

    return clone({
      requests: store.requests
        .filter((request) => byId.has(request.id))
        .map((request) => ({
          id: request.id,
          requestNumber: request.requestNumber,
          requestDate: request.requestDate,
          branchId: request.branchId,
          categoryId: request.categoryId,
          subCategoryId: request.subCategoryId,
          amount: request.amount,
          status: request.status,
          decidedAt: request.decision?.decidedAt,
          paidAt: request.paidAt,
        })),
      asOf: context.now(),
      currency: context.currency,
      precision: context.precision,
    })
  },

  /** Mirrors the list exactly — same scope, same filters, its own permission. */
  async exportRequests(query) {
    await guard("requests")
    const context = scenarioContext()
    require(context, accountingPermissions.export)
    const page = await this.listRequests(
      { ...query, page: 1, pageSize: 1000 },
      undefined
    )
    return page.items.map((item) => ({
      requestNumber: item.requestNumber,
      requestDate: item.requestDate,
      branchLabel: item.branchLabel,
      requesterName: item.requesterName,
      categoryLabel: item.categoryLabel,
      subCategoryLabel: item.subCategoryLabel ?? "",
      amount: item.amount.amount,
      status: item.status,
    }))
  },

  async listHistory(requestId) {
    await guard("history")
    const context = scenarioContext()
    require(context, accountingPermissions.historyView)
    const request = findRequest(requestId, context)
    return clone(sortHistory(historyOf(request.id)))
  },

  async listComments(requestId) {
    await guard("detail")
    const context = scenarioContext()
    require(context, accountingPermissions.requestsView)
    const request = findRequest(requestId, context)
    return clone(
      [...commentsOf(request.id)].sort((left, right) =>
        left.createdAt.localeCompare(right.createdAt)
      )
    )
  },

  /**
   * Comments are discussion, deliberately separate from the history.
   *
   * Nothing a commenter writes can dilute the record of transitions, and adding
   * one writes no history entry (spec FR-037).
   */
  async addComment(command) {
    await guard("detail")
    const context = scenarioContext()
    require(context, accountingPermissions.commentsAdd)
    const request = findRequest(command.requestId, context)

    const body = command.body.trim()
    if (!body) throw new AccountingError("validation-failed", { field: "body" })

    const comment: ExpenseComment = {
      id: nextId("comment") as CommentId,
      requestId: request.id,
      body,
      author: context.actor,
      createdAt: context.now(),
    }
    store.comments.push(comment)
    invalidateIndexes()
    return clone(comment)
  },

  /**
   * Categories for a picker or for administration.
   *
   * `activeOnly` is what pickers pass. Display never uses this read — it uses
   * `resolveCategory`, which returns archived rows too, so an archived category
   * still renders on a request that references it (research R7).
   */
  async listCategories(query) {
    await guard("categories")
    const context = scenarioContext()
    require(context, accountingPermissions.categoriesView)

    const search = query.search ? normalizeSearchTerm(query.search) : undefined
    const rows = store.categories.filter((category) => {
      if (category.organizationId !== context.organizationId) return false
      if (query.activeOnly && category.status !== "active") return false
      if (query.statuses?.length && !query.statuses.includes(category.status))
        return false
      if (search && !normalizeSearchTerm(category.name).includes(search))
        return false
      return true
    })

    const page = clampPage(query.page, query.pageSize, rows.length)
    const start = (page - 1) * query.pageSize
    return {
      items: rows.slice(start, start + query.pageSize).map(toCategorySummary),
      total: rows.length,
      page,
      pageSize: query.pageSize,
      totalPages: Math.max(1, Math.ceil(rows.length / query.pageSize)),
    }
  },

  async listSubCategories(query) {
    await guard("categories")
    const context = scenarioContext()
    require(context, accountingPermissions.categoriesView)

    const search = query.search ? normalizeSearchTerm(query.search) : undefined
    const rows = store.subCategories.filter((subCategory) => {
      if (subCategory.organizationId !== context.organizationId) return false
      const parent = categoryOf(subCategory.categoryId)
      // Archiving a parent removes its children from the choices without
      // changing their own status (spec FR-006).
      if (query.activeOnly && (subCategory.status !== "active" || parent?.status !== "active"))
        return false
      if (query.statuses?.length && !query.statuses.includes(subCategory.status))
        return false
      if (query.categoryIds?.length && !query.categoryIds.includes(subCategory.categoryId))
        return false
      if (search && !normalizeSearchTerm(subCategory.name).includes(search))
        return false
      return true
    })

    const page = clampPage(query.page, query.pageSize, rows.length)
    const start = (page - 1) * query.pageSize
    return {
      items: rows.slice(start, start + query.pageSize).map(toSubCategorySummary),
      total: rows.length,
      page,
      pageSize: query.pageSize,
      totalPages: Math.max(1, Math.ceil(rows.length / query.pageSize)),
    }
  },

  /** For display. Returns archived rows, unlike the picker read. */
  async resolveCategory(categoryId) {
    await guard("categories")
    const category = categoryOf(categoryId)
    return category ? toCategorySummary(category) : undefined
  },

  async resolveSubCategory(subCategoryId) {
    await guard("categories")
    const subCategory = subCategoryOf(subCategoryId)
    return subCategory ? toSubCategorySummary(subCategory) : undefined
  },

  async createCategory(command) {
    await guard("categories")
    const context = scenarioContext()
    require(context, accountingPermissions.categoriesManage)
    const input = parseCategory(command.input)
    assertCategoryNameFree(input.name, context.organizationId)

    const now = context.now()
    const category: ExpenseCategory = {
      id: nextId("category") as ExpenseCategoryId,
      organizationId: context.organizationId,
      name: input.name,
      description: input.description,
      status: "active",
      createdAt: now,
      createdBy: context.actor,
      updatedAt: now,
      updatedBy: context.actor,
      version: 1,
    }
    store.categories.push(category)
    invalidateIndexes()
    return toCategorySummary(category)
  },

  async updateCategory(command) {
    await guard("categories")
    const context = scenarioContext()
    require(context, accountingPermissions.categoriesManage)
    const category = findCategory(command.categoryId, context)
    assertVersion(category, command.expectedVersion)
    const input = parseCategory(command.input)
    assertCategoryNameFree(input.name, context.organizationId, category.id)

    category.name = input.name
    category.description = input.description
    touch(category, context)
    invalidateIndexes()
    return toCategorySummary(category)
  },

  async setCategoryStatus(command) {
    await guard("categories")
    const context = scenarioContext()
    require(context, accountingPermissions.categoriesManage)
    const category = findCategory(command.categoryId, context)
    assertVersion(category, command.expectedVersion)

    category.status = command.status
    touch(category, context)
    invalidateIndexes()
    return toCategorySummary(category)
  },

  async createSubCategory(command) {
    await guard("categories")
    const context = scenarioContext()
    require(context, accountingPermissions.categoriesManage)
    const parent = findCategory(command.categoryId, context)
    const input = parseCategory(command.input)
    assertSubCategoryNameFree(input.name, parent.id)

    const now = context.now()
    const subCategory: ExpenseSubCategory = {
      id: nextId("sub-category") as ExpenseSubCategoryId,
      organizationId: context.organizationId,
      categoryId: parent.id,
      name: input.name,
      description: input.description,
      status: "active",
      createdAt: now,
      createdBy: context.actor,
      updatedAt: now,
      updatedBy: context.actor,
      version: 1,
    }
    store.subCategories.push(subCategory)
    invalidateIndexes()
    return toSubCategorySummary(subCategory)
  },

  async updateSubCategory(command) {
    await guard("categories")
    const context = scenarioContext()
    require(context, accountingPermissions.categoriesManage)
    const subCategory = findSubCategory(command.subCategoryId, context)
    assertVersion(subCategory, command.expectedVersion)
    const input = parseCategory(command.input)
    assertSubCategoryNameFree(input.name, subCategory.categoryId, subCategory.id)

    subCategory.name = input.name
    subCategory.description = input.description
    touch(subCategory, context)
    invalidateIndexes()
    return toSubCategorySummary(subCategory)
  },

  async setSubCategoryStatus(command) {
    await guard("categories")
    const context = scenarioContext()
    require(context, accountingPermissions.categoriesManage)
    const subCategory = findSubCategory(command.subCategoryId, context)
    assertVersion(subCategory, command.expectedVersion)

    subCategory.status = command.status
    touch(subCategory, context)
    invalidateIndexes()
    return toSubCategorySummary(subCategory)
  },

  async createRequest(command) {
    await guard("requests")
    const context = scenarioContext()
    require(context, accountingPermissions.requestsCreate)
    validateInput(command.input, context)

    if (
      !context.organizationWide &&
      !context.authorizedBranchIds.includes(command.input.branchId)
    )
      throw new AccountingError("out-of-scope")

    store.requestSequence += 1
    const now = context.now()
    const request: ExpenseRequest = {
      id: nextId("request") as ExpenseRequestId,
      organizationId: context.organizationId,
      requestNumber: formatRequestNumber(numberingPolicy, store.requestSequence),
      requestDate: command.input.requestDate,
      branchId: command.input.branchId,
      // Denormalized, so a departed requester is still named (FR-010).
      requestedBy: context.actor,
      categoryId: command.input.categoryId,
      subCategoryId: command.input.subCategoryId,
      description: command.input.description.trim(),
      amount: makeMoney(command.input.amount, context.currency, context.precision),
      status: "draft",
      createdAt: now,
      createdBy: context.actor,
      updatedAt: now,
      updatedBy: context.actor,
      version: 1,
    }
    store.requests.push(request)
    invalidateIndexes()

    appendHistory({
      request,
      action: "created",
      fromStatus: null,
      toStatus: "draft",
      context,
    })
    return toRequestDetail(request, context)
  },

  async updateRequest(command) {
    await guard("detail")
    const context = scenarioContext()
    require(context, accountingPermissions.requestsUpdate)
    const request = findRequest(command.requestId, context)
    // Editable only while Draft or Returned (FR-013).
    if (!isEditable(request.status)) throw new AccountingError("not-editable")
    assertVersion(request, command.expectedVersion)
    validateInput(command.input, context)

    applyInput(request, command.input, context)
    touch(request, context)
    invalidateIndexes()
    return toRequestDetail(request, context)
  },

  async submitRequest(command) {
    await guard("detail")
    const context = scenarioContext()
    const request = findRequest(command.requestId, context)
    // The whole request is validated before the transition, so a submission never
    // moves an invalid record into a reviewer's queue.
    validateInput(
      {
        requestDate: request.requestDate,
        branchId: request.branchId,
        categoryId: request.categoryId,
        subCategoryId: request.subCategoryId,
        description: request.description,
        amount: request.amount.amount,
      },
      context
    )
    transition({
      request,
      to: "submitted",
      context,
      expectedVersion: command.expectedVersion,
    })
    return toRequestDetail(request, context)
  },

  /**
   * Entering review is an explicit act, never a side effect of reading.
   *
   * Flipping the status when a reviewer opens the detail page would make a GET
   * mutate state: an executive glancing at a request would silently claim it, and
   * the history would fill with entries nobody performed deliberately (R2).
   */
  async startReview(command) {
    await guard("detail")
    const context = scenarioContext()
    const request = findRequest(command.requestId, context)
    transition({
      request,
      to: "under-review",
      context,
      expectedVersion: command.expectedVersion,
    })
    request.reviewer = context.actor
    return toRequestDetail(request, context)
  },

  async decideRequest(command) {
    await guard("detail")
    const context = scenarioContext()
    const request = findRequest(command.requestId, context)

    const to: ExpenseStatus =
      command.decision === "returned" ? "returned-for-revision" : command.decision

    // The note requirement comes from the policy table, not from a per-decision
    // conditional here — one place decides what a negative outcome must carry.
    transition({
      request,
      to,
      context,
      expectedVersion: command.expectedVersion,
      note: command.note,
    })

    request.decision = {
      decision: command.decision,
      note: command.note?.trim() || undefined,
      decidedAt: context.now(),
      // Names the actor, so a Super Admin override is visible as one (FR-022b).
      decidedBy: context.actor,
    }
    // A returned request goes back to its branch; it is no longer under anyone's
    // review, so the reviewer is cleared rather than left as a stale claim.
    if (to === "returned-for-revision") request.reviewer = undefined
    return toRequestDetail(request, context)
  },

  /**
   * Records that payment happened — elsewhere.
   *
   * This module documents the fact for reporting and audit; it moves no money and
   * holds no bank details. Marking paid carries its own authority, distinct from
   * approving, because taking the decision and releasing the funds are different
   * jobs (spec FR-027).
   */
  async markPaid(command) {
    await guard("detail")
    const context = scenarioContext()
    const request = findRequest(command.requestId, context)
    transition({
      request,
      to: "paid",
      context,
      expectedVersion: command.expectedVersion,
    })
    request.paidAt = context.now()
    return toRequestDetail(request, context)
  },

  async cancelRequest(command) {
    await guard("detail")
    const context = scenarioContext()
    const request = findRequest(command.requestId, context)
    transition({
      request,
      to: "cancelled",
      context,
      expectedVersion: command.expectedVersion,
      note: command.reason,
    })
    request.cancelReason = command.reason.trim()
    return toRequestDetail(request, context)
  },

  async uploadAttachment(command) {
    await guard("detail")
    const context = scenarioContext()
    require(context, accountingPermissions.attachmentsManage)
    const request = findRequest(command.requestId, context)

    /**
     * The idempotency check runs **before** the version assert.
     *
     * A genuine retry carries the version the client held before the first
     * attempt succeeded, so checking the version first would reject exactly the
     * case the retry exists to handle (research R6).
     */
    const existing = attachmentsOf(request.id).find(
      (attachment) => attachment.uploadAttempt === command.uploadAttempt
    )
    if (existing) return toRequestDetail(request, context)

    if (!isEditable(request.status)) throw new AccountingError("not-editable")
    assertVersion(request, command.expectedVersion)

    const verdict = validateAttachment(
      { mimeType: command.mimeType, sizeBytes: command.sizeBytes },
      attachmentPolicy
    )
    if (!verdict.ok)
      throw new AccountingError(
        verdict.code,
        verdict.code === "attachment-too-large"
          ? { limit: verdict.limit }
          : { acceptedTypes: verdict.acceptedTypes }
      )

    store.attachments.push({
      id: nextId("attachment") as AttachmentId,
      requestId: request.id,
      kind: command.kind,
      fileName: command.fileName,
      mimeType: command.mimeType.trim().toLowerCase(),
      sizeBytes: command.sizeBytes,
      uploadAttempt: command.uploadAttempt,
      uploadedBy: context.actor,
      uploadedAt: context.now(),
    })
    touch(request, context)
    invalidateIndexes()
    return toRequestDetail(request, context)
  },

  async removeAttachment(command) {
    await guard("detail")
    const context = scenarioContext()
    require(context, accountingPermissions.attachmentsManage)
    const request = findRequest(command.requestId, context)
    if (!isEditable(request.status)) throw new AccountingError("not-editable")
    assertVersion(request, command.expectedVersion)

    const index = store.attachments.findIndex(
      (attachment) =>
        attachment.id === command.attachmentId && attachment.requestId === request.id
    )
    if (index < 0) throw new AccountingError("not-found")
    store.attachments.splice(index, 1)
    touch(request, context)
    invalidateIndexes()
    return toRequestDetail(request, context)
  },
}
