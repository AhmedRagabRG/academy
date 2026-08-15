import { ApiError, httpClient, type PageMeta, type QueryValue } from "@/shared/api"
import { sum, toMinor, zeroMoney } from "@/shared/utils/money"
import { attachmentPolicy, numberingPolicy, ORGANIZATION_ID } from "../data/accounting-lookups"
import type { ExpenseCategoryId, ExpenseStatus, ExpenseSubCategoryId, Paginated } from "../types/common"
import type {
  AccountingDashboard,
  AccountingExportContext,
  ExpenseRequestDetail,
  ExpenseRequestSummary,
  ExportRow,
} from "../types/projections"
import type { ExpenseRequestListQuery } from "../types/commands"
import { AccountingError } from "./accounting-error"
import { takePendingUpload } from "./pending-uploads"
import type { AccountingLookups, AccountingService } from "./accounting-service"
import {
  toAreaPermissions,
  toCategoryStatus,
  toCategorySummary,
  toComment,
  toPaginated,
  toRequestDetail,
  toRequestListParams,
  toRequestSummary,
  toSubCategorySummary,
  type AccountingDirectory,
  type ApiBranch,
  type ApiComment,
  type ApiExpenseDetail,
  type ApiExpenseSummary,
  type ApiLookupValue,
  type ApiUser,
} from "./accounting-mapper"

/**
 * The Accounting module against the live API.
 *
 * Three things shape this file, all of them consequences of the API being
 * narrower than the module's own contract:
 *
 * 1. Expenses carry ids, not labels, so a **directory** of branches,
 *    categories and people is assembled from Settings and cached, then joined
 *    onto every row. Without it a list of rows would cost a request each.
 * 2. Every command answers with the *summary* shape while this module's
 *    commands are defined to return the full detail, so each one re-reads the
 *    request it just changed.
 * 3. An upload describes a file but cannot carry it, so the bytes are claimed
 *    from the staging registry the picker writes to.
 */

const EXPENSES = "/expenses"
/**
 * Categories are served by Accounting rather than Settings.
 *
 * The rows still live in the shared lookup store, but these routes are guarded
 * by `accounting.categories.*`, so a user who may manage expense categories no
 * longer needs blanket authority over every lookup group in the organization.
 */
const CATEGORIES = `${EXPENSES}/categories`
const SUBCATEGORIES = `${EXPENSES}/subcategories`

/** The API's ceiling on a page, so a full read pages rather than truncating. */
const MAX_PAGE_SIZE = 100

// ── Errors ──────────────────────────────────────────────────────────────────

/** A supporting figure the API returns as a `details` entry rather than a field. */
function detail(error: ApiError, field: string): string | undefined {
  return error.details.find((entry) => entry.field === field)?.message
}

/**
 * The API's error vocabulary in this module's terms.
 *
 * `currentVersion` is read out of `details` rather than off `ApiError`: the API
 * reports it as a named detail entry, so the transport's own typed field is
 * never populated for these responses.
 */
function toAccountingError(error: unknown): AccountingError {
  if (!(error instanceof ApiError))
    return new AccountingError("validation-failed")

  const { code, status } = error
  const currentVersion = Number(detail(error, "currentVersion"))

  if (code === "VERSION_CONFLICT")
    return new AccountingError("version-conflict", {
      currentVersion: Number.isFinite(currentVersion) ? currentVersion : undefined,
    })
  if (code === "INVALID_STATUS")
    return new AccountingError("invalid-transition", {
      from: detail(error, "fromStatus"),
      to: detail(error, "attempted"),
    })
  if (code === "INVALID_CATEGORY")
    return new AccountingError(
      detail(error, "subcategoryId") ? "subcategory-mismatch" : "category-inactive"
    )
  if (code === "FILE_TOO_LARGE")
    return new AccountingError("attachment-too-large", {
      limit: detail(error, "maxBytes"),
    })
  if (code === "UNSUPPORTED_FILE_TYPE")
    return new AccountingError("attachment-type-rejected", {
      acceptedTypes: detail(error, "accepted"),
    })
  if (code === "out-of-scope") return new AccountingError("out-of-scope")
  if (status === 404) return new AccountingError("not-found")
  if (status === 401 || status === 403) return new AccountingError("forbidden")
  if (code === "DUPLICATE_VALUE" || code === "DUPLICATE_CODE" || status === 409)
    return new AccountingError("duplicate-name")

  if (code === "VALIDATION_ERROR" || status === 422) {
    const field = error.details[0]?.field
    if (field === "amount") return new AccountingError("amount-invalid")
    if (field === "categoryId") return new AccountingError("category-required")
    return new AccountingError("validation-failed", { field })
  }
  return new AccountingError("validation-failed")
}

const rethrow = (error: unknown): never => {
  if (error instanceof DOMException && error.name === "AbortError") throw error
  if (error instanceof AccountingError) throw error
  throw toAccountingError(error)
}

/** An operation this module models but the API serves no route for. */
const unsupported = (operation: string): never => {
  throw new AccountingError("unsupported", { field: operation })
}

// ── Paging helpers ──────────────────────────────────────────────────────────

interface ApiPage<T> {
  items: T[]
  meta: PageMeta
}

/** A list read. Every endpoint here returns the shared hoisted envelope. */
async function getPage<T>(
  path: string,
  query: Record<string, QueryValue>,
  signal?: AbortSignal
): Promise<ApiPage<T>> {
  const page = await httpClient.getPage<T>(path, query, signal)
  return { items: page.items, meta: page.meta }
}

/** Every page of a list, for the reference data a join needs in full. */
async function getAll<T>(
  path: string,
  query: Record<string, QueryValue> = {},
  signal?: AbortSignal
): Promise<T[]> {
  const first = await getPage<T>(
    path,
    { ...query, page: 1, pageSize: MAX_PAGE_SIZE },
    signal
  )
  const rows = [...first.items]
  for (let page = 2; page <= (first.meta.totalPages || 1); page += 1) {
    const next = await getPage<T>(
      path,
      { ...query, page, pageSize: MAX_PAGE_SIZE },
      signal
    )
    rows.push(...next.items)
  }
  return rows
}

/**
 * Reference data an Accounting user may not be allowed to read.
 *
 * Branches, lookup values and the user list are guarded by `settings.*`
 * permissions this module does not require. A refusal degrades the *labels*
 * rather than the request: the rows still render, identified by id.
 */
async function optional<T>(read: Promise<T[]>): Promise<T[]> {
  try {
    return await read
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error
    if (error instanceof ApiError && (error.status === 401 || error.status === 403))
      return []
    throw error
  }
}

// ── Session and directory ───────────────────────────────────────────────────

interface SessionFacts {
  permissionKeys: readonly string[]
  organizationId: string
  actorId: string
  actorName: string
}

interface DirectoryFacts {
  directory: AccountingDirectory
  categories: ApiLookupValue[]
  subCategories: ApiLookupValue[]
  branches: ApiBranch[]
  users: ApiUser[]
  session: SessionFacts
}

/**
 * The joined reference data, cached for a short while.
 *
 * Every list read needs it and it changes rarely, so re-reading five endpoints
 * per keystroke in a search box would be the dominant cost of the screen. The
 * window is short enough that a category edit shows up on its own, and the
 * mutations that change it drop the cache outright.
 */
const DIRECTORY_TTL_MS = 30_000
let cache: { at: number; value: Promise<DirectoryFacts> } | null = null

const dropDirectoryCache = () => {
  cache = null
}

/**
 * Deliberately takes no `AbortSignal`.
 *
 * The result is shared by every caller in the window, so binding it to one
 * caller's signal would let that caller's cancellation reject the promise
 * everyone else is already awaiting — and a cancellation is routine, since a
 * component that unmounts or re-renders aborts its in-flight reads. These are
 * small reference reads; letting them finish costs less than the sharing bug.
 */
function loadDirectory(): Promise<DirectoryFacts> {
  const now = Date.now()
  if (cache && now - cache.at < DIRECTORY_TTL_MS) return cache.value

  const value = (async (): Promise<DirectoryFacts> => {
    const [session, general, branches, categories, subCategories, users] =
      await Promise.all([
        httpClient.get<{
          permissionKeys?: string[]
          employee?: { id: string; displayName: string }
        }>("/auth/session"),
        httpClient
          .get<{ currency?: string; organizationId?: string }>("/settings/general")
          .catch(() => null),
        optional(getAll<ApiBranch>("/settings/branches", { status: "ALL" })),
        optional(getAll<ApiLookupValue>(CATEGORIES, { status: "ALL" })),
        optional(
          getAll<ApiLookupValue>(SUBCATEGORIES, { status: "ALL" })
        ),
        optional(getAll<ApiUser>("/settings/users", {})),
      ])

    const branchNames = new Map(branches.map((row) => [row.id, row.name]))
    const categoryRows = new Map(categories.map((row) => [row.id, row]))
    const subCategoryRows = new Map(subCategories.map((row) => [row.id, row]))
    const userNames = new Map(users.map((row) => [row.id, row.displayName]))

    const directory: AccountingDirectory = {
      // An unresolvable id is shown as itself. It is not a name, but it is the
      // truth, and it keeps one missing permission from blanking a column.
      branchLabel: (id) => branchNames.get(id) ?? id,
      categoryLabel: (id) => categoryRows.get(id)?.name ?? id,
      categoryStatus: (id) => {
        const row = categoryRows.get(id)
        return row ? toCategoryStatus(row.status) : undefined
      },
      subCategoryLabel: (id) => subCategoryRows.get(id)?.name,
      subCategoryStatus: (id) => {
        const row = subCategoryRows.get(id)
        return row ? toCategoryStatus(row.status) : undefined
      },
      requesterName: (id) => userNames.get(id) ?? id,
      currency: general?.currency ?? "EGP",
      precision: 2,
    }

    return {
      directory,
      categories,
      subCategories,
      branches,
      users,
      session: {
        permissionKeys: session?.permissionKeys ?? [],
        organizationId: general?.organizationId ?? ORGANIZATION_ID,
        actorId: session?.employee?.id ?? "",
        actorName: session?.employee?.displayName ?? "",
      },
    }
  })()

  cache = { at: now, value }
  // A failed load must not be remembered, or one flaky read poisons the screen
  // for the whole window.
  value.catch(dropDirectoryCache)
  return value
}

// ── Client-side filtering ───────────────────────────────────────────────────

/**
 * Applies the filters the API cannot express.
 *
 * It filters by a single value per field; this module filters by sets. A set
 * wider than one is applied here to the returned page, which narrows the rows
 * on screen without ever silently dropping the rest of the selection.
 */
function applyClientFilters(
  rows: ExpenseRequestSummary[],
  clientSide: ReturnType<typeof toRequestListParams>["clientSide"]
): ExpenseRequestSummary[] {
  const { branchIds, categoryIds, subCategoryIds, requesterIds, statuses } =
    clientSide
  if (!branchIds && !categoryIds && !subCategoryIds && !requesterIds && !statuses)
    return rows
  return rows.filter(
    (row) =>
      (!branchIds || branchIds.includes(row.branchId)) &&
      (!statuses || statuses.includes(row.status))
  )
}

// ── Service ─────────────────────────────────────────────────────────────────

/**
 * The whole detail page in one call.
 *
 * The detail endpoint carries attachments and history but not the discussion,
 * which is its own resource — so the thread is read alongside rather than
 * leaving every screen to fetch it separately.
 */
async function fetchDetail(
  requestId: string,
  signal?: AbortSignal
): Promise<ExpenseRequestDetail> {
  const [row, facts, comments] = await Promise.all([
    httpClient.get<ApiExpenseDetail>(`${EXPENSES}/${requestId}`, undefined, signal),
    loadDirectory(),
    httpClient
      .get<ApiComment[]>(`${EXPENSES}/${requestId}/comments`, undefined, signal)
      .catch(() => [] as ApiComment[]),
  ])
  return {
    ...toRequestDetail(
      row,
      facts.directory,
      facts.session.permissionKeys,
      facts.session.organizationId
    ),
    comments: (comments ?? []).map(toComment),
  }
}

async function listSummaries(
  query: ExpenseRequestListQuery,
  signal?: AbortSignal
): Promise<Paginated<ExpenseRequestSummary>> {
  const { params, clientSide } = toRequestListParams(query)
  const [page, facts] = await Promise.all([
    getPage<ApiExpenseSummary>(EXPENSES, params, signal),
    loadDirectory(),
  ])
  const rows = page.items.map((row) => toRequestSummary(row, facts.directory))
  const filtered = applyClientFilters(rows, clientSide)
  const paginated = toPaginated(filtered, page.meta)
  // Narrowing in the client makes the server's total wrong for the rows shown.
  return filtered.length === rows.length
    ? paginated
    : { ...paginated, total: filtered.length, totalPages: 1 }
}

/** Every row matching a query, for the derivations that aggregate a whole set. */
async function listEvery(
  query: ExpenseRequestListQuery,
  signal?: AbortSignal
): Promise<ExpenseRequestSummary[]> {
  const first = await listSummaries(
    { ...query, page: 1, pageSize: MAX_PAGE_SIZE },
    signal
  )
  const rows = [...first.items]
  for (let page = 2; page <= first.totalPages; page += 1) {
    const next = await listSummaries(
      { ...query, page, pageSize: MAX_PAGE_SIZE },
      signal
    )
    rows.push(...next.items)
  }
  return rows
}

/** A new lookup row's code, derived from its name and kept unique-ish. */
function toLookupCode(name: string, taken: ReadonlySet<string>): string {
  const base =
    name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\p{Letter}\p{Number}-]/gu, "")
      .slice(0, 50) || "category"
  if (!taken.has(base)) return base
  for (let suffix = 2; suffix < 100; suffix += 1) {
    const candidate = `${base}-${suffix}`
    if (!taken.has(candidate)) return candidate
  }
  return `${base}-${Date.now()}`
}

const nextSortOrder = (rows: readonly ApiLookupValue[]): number =>
  rows.reduce((highest, row) => Math.max(highest, row.sortOrder), 0) + 10

export const httpAccountingService: AccountingService = {
  // ── Reads ─────────────────────────────────────────────────────────────────

  async listRequests(query, signal) {
    try {
      return await listSummaries(query, signal)
    } catch (error) {
      return rethrow(error)
    }
  },

  async getRequest(requestId, signal) {
    try {
      return await fetchDetail(requestId, signal)
    } catch (error) {
      return rethrow(error)
    }
  },

  async listHistory(requestId, signal) {
    try {
      return (await fetchDetail(requestId, signal)).history
    } catch (error) {
      return rethrow(error)
    }
  },

  async listComments(requestId, signal) {
    try {
      const rows = await httpClient.get<ApiComment[]>(
        `${EXPENSES}/${requestId}/comments`,
        undefined,
        signal
      )
      return (rows ?? []).map(toComment)
    } catch (error) {
      return rethrow(error)
    }
  },

  async listCategories(query) {
    try {
      const facts = await loadDirectory()
      const counts = new Map<string, number>()
      for (const row of facts.subCategories)
        if (row.parentValueId)
          counts.set(row.parentValueId, (counts.get(row.parentValueId) ?? 0) + 1)

      const rows = facts.categories
        .filter((row) => matchesCategoryQuery(row, query))
        .map((row) => toCategorySummary(row, counts.get(row.id) ?? 0))
      return paginate(rows, query.page, query.pageSize)
    } catch (error) {
      return rethrow(error)
    }
  },

  async listSubCategories(query) {
    try {
      const facts = await loadDirectory()
      const rows = facts.subCategories
        .filter((row) => matchesCategoryQuery(row, query))
        .filter(
          (row) =>
            !query.categoryIds?.length ||
            (row.parentValueId !== null &&
              query.categoryIds.includes(row.parentValueId as ExpenseCategoryId))
        )
        .map((row) =>
          toSubCategorySummary(
            row,
            row.parentValueId
              ? facts.directory.categoryLabel(row.parentValueId)
              : ""
          )
        )
      return paginate(rows, query.page, query.pageSize)
    } catch (error) {
      return rethrow(error)
    }
  },

  /**
   * Derived from the same list read the queue uses.
   *
   * The API serves no aggregate, and computing these from a second source
   * would let the dashboard disagree with the list beneath it.
   */
  async getDashboard(query, signal) {
    try {
      const facts = await loadDirectory()
      const { currency, precision } = facts.directory
      const scope: ExpenseRequestListQuery = {
        page: 1,
        pageSize: MAX_PAGE_SIZE,
        branchIds: query.branchIds,
      }
      const all = await listEvery(scope, signal)

      const countOf = (statuses: ExpenseStatus[]) =>
        all.filter((row) => statuses.includes(row.status)).length

      /**
       * Money aggregates cover the organization's own currency.
       *
       * The API now records every request in the organization's currency, so
       * this normally spans everything. It stays as a guard rather than an
       * assumption because rows predating that rule can still hold another
       * denomination, and adding two currencies is undefined without a rate
       * this module has no business inventing. Such a row is left out of the
       * totals *and* the counts beside them, so a breakdown row never counts
       * what it did not add.
       */
      const summable = all.filter((row) => row.amount.currency === currency)

      const month = query.month ?? new Date().toISOString().slice(0, 7)
      const monthly = summable.filter((row) => row.requestDate.startsWith(month))

      const sumOf = (rows: ExpenseRequestSummary[]) =>
        rows.length
          ? sum(rows.map((row) => row.amount), currency, precision)
          : zeroMoney(currency, precision)

      const groupTotals = (
        rows: ExpenseRequestSummary[],
        key: (row: ExpenseRequestSummary) => { id: string; label: string }
      ) => {
        const buckets = new Map<
          string,
          { label: string; rows: ExpenseRequestSummary[] }
        >()
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
          .sort((left, right) => toMinor(right.total) - toMinor(left.total))
      }

      return {
        counts: {
          pending: countOf(["submitted", "under-review", "returned-for-revision"]),
          approved: countOf(["approved"]),
          rejected: countOf(["rejected"]),
          paid: countOf(["paid"]),
        },
        monthlyTotal: sumOf(monthly),
        byBranch: groupTotals(summable, (row) => ({
          id: row.branchId,
          label: row.branchLabel,
        })),
        byCategory: groupTotals(summable, (row) => ({
          id: row.categoryLabel,
          label: row.categoryLabel,
        })),
        recent: [...all]
          .sort((left, right) => right.requestDate.localeCompare(left.requestDate))
          .slice(0, 5),
        hasNoRecords: all.length === 0,
        asOf: new Date().toISOString(),
        permissions: toAreaPermissions(facts.session.permissionKeys),
      } satisfies AccountingDashboard
    } catch (error) {
      return rethrow(error)
    }
  },

  async lookups() {
    try {
      const facts = await loadDirectory()
      const counts = new Map<string, number>()
      for (const row of facts.subCategories)
        if (row.parentValueId)
          counts.set(row.parentValueId, (counts.get(row.parentValueId) ?? 0) + 1)

      const isActive = (row: ApiLookupValue) => toCategoryStatus(row.status) === "active"
      const activeCategories = facts.categories.filter(isActive)
      const activeIds = new Set(activeCategories.map((row) => row.id))

      return {
        numbering: numberingPolicy,
        attachments: attachmentPolicy,
        currency: facts.directory.currency,
        precision: facts.directory.precision,
        branches: facts.branches
          .filter((branch) => branch.status.toLowerCase() === "active")
          .map((branch) => ({ value: branch.id, label: branch.name })),
        // Pickers offer active rows only; display resolves archived ones.
        categories: activeCategories.map((row) =>
          toCategorySummary(row, counts.get(row.id) ?? 0)
        ),
        subCategories: facts.subCategories
          .filter(
            (row) =>
              isActive(row) && row.parentValueId !== null && activeIds.has(row.parentValueId)
          )
          .map((row) =>
            toSubCategorySummary(
              row,
              row.parentValueId ? facts.directory.categoryLabel(row.parentValueId) : ""
            )
          ),
        requesters: facts.users.map((user) => ({
          value: user.id,
          label: user.displayName,
        })),
      } satisfies AccountingLookups
    } catch (error) {
      return rethrow(error)
    }
  },

  async exportRequests(query, signal): Promise<ExportRow[]> {
    try {
      const rows = await listEvery(query, signal)
      return rows.map((row) => ({
        requestNumber: row.requestNumber,
        requestDate: row.requestDate,
        branchLabel: row.branchLabel,
        requesterName: row.requesterName,
        categoryLabel: row.categoryLabel,
        subCategoryLabel: row.subCategoryLabel ?? "",
        amount: row.amount.amount,
        status: row.status,
      }))
    } catch (error) {
      return rethrow(error)
    }
  },

  async getAccountingExportContext(query, signal) {
    try {
      const [rows, facts] = await Promise.all([
        listEvery(query, signal),
        loadDirectory(),
      ])
      const { currency, precision } = facts.directory
      return {
        requests: rows.map((row) => ({
          id: row.id,
          requestNumber: row.requestNumber,
          requestDate: row.requestDate,
          branchId: row.branchId,
          // Labels are what a summary carries; the ids behind them are not
          // reproduced here rather than being guessed back from a label.
          categoryId: row.categoryLabel as ExpenseCategoryId,
          subCategoryId: row.subCategoryLabel as ExpenseSubCategoryId | undefined,
          amount: row.amount,
          status: row.status,
        })),
        asOf: new Date().toISOString(),
        currency,
        precision,
      } satisfies AccountingExportContext
    } catch (error) {
      return rethrow(error)
    }
  },

  // ── Request commands ──────────────────────────────────────────────────────

  async createRequest(command) {
    try {
      const facts = await loadDirectory()
      const created = await httpClient.post<ApiExpenseSummary>(EXPENSES, {
        branchId: command.input.branchId,
        categoryId: command.input.categoryId,
        subcategoryId: command.input.subCategoryId,
        expenseDate: command.input.requestDate,
        description: command.input.description,
        amount: command.input.amount,
        currency: facts.directory.currency,
      })
      return await fetchDetail(created.id)
    } catch (error) {
      return rethrow(error)
    }
  },

  async updateRequest(command) {
    try {
      await httpClient.patch<ApiExpenseSummary>(`${EXPENSES}/${command.requestId}`, {
        expectedVersion: command.expectedVersion,
        expenseDate: command.input.requestDate,
        description: command.input.description,
        amount: command.input.amount,
        categoryId: command.input.categoryId,
        subcategoryId: command.input.subCategoryId,
      })
      return await fetchDetail(command.requestId)
    } catch (error) {
      return rethrow(error)
    }
  },

  async submitRequest(command) {
    try {
      await httpClient.post(`${EXPENSES}/${command.requestId}/submit`, {
        expectedVersion: command.expectedVersion,
      })
      return await fetchDetail(command.requestId)
    } catch (error) {
      return rethrow(error)
    }
  },

  async startReview(command) {
    try {
      await httpClient.post(`${EXPENSES}/${command.requestId}/review`, {
        expectedVersion: command.expectedVersion,
      })
      return await fetchDetail(command.requestId)
    } catch (error) {
      return rethrow(error)
    }
  },

  async decideRequest(command) {
    const route =
      command.decision === "approved"
        ? "approve"
        : command.decision === "rejected"
          ? "reject"
          : "return"
    try {
      await httpClient.post(`${EXPENSES}/${command.requestId}/${route}`, {
        expectedVersion: command.expectedVersion,
        comment: command.note,
      })
      return await fetchDetail(command.requestId)
    } catch (error) {
      return rethrow(error)
    }
  },

  async markPaid(command) {
    try {
      await httpClient.post(`${EXPENSES}/${command.requestId}/pay`, {
        expectedVersion: command.expectedVersion,
      })
      return await fetchDetail(command.requestId)
    } catch (error) {
      return rethrow(error)
    }
  },

  /**
   * Sent to the archive route — the one guarded by `accounting.requests.cancel`.
   *
   * The API only accepts it on a settled request, so the control is offered
   * from its own `canArchive` flag rather than from this module's transition
   * table, which would also offer it on a draft.
   */
  async cancelRequest(command) {
    try {
      await httpClient.post(`${EXPENSES}/${command.requestId}/archive`, {
        expectedVersion: command.expectedVersion,
        comment: command.reason,
      })
      return await fetchDetail(command.requestId)
    } catch (error) {
      return rethrow(error)
    }
  },

  // ── Attachments ───────────────────────────────────────────────────────────

  /**
   * The command carries metadata but not the bytes, while the API takes a
   * multipart upload. The file itself is read from the pending-upload registry
   * the dropzone writes to, keyed by the same idempotency token.
   */
  async uploadAttachment(command) {
    const file = takePendingUpload(command.uploadAttempt)
    if (!file) return unsupported("uploadAttachment")
    try {
      const form = new FormData()
      form.append("file", file, command.fileName)
      form.append("uploadAttemptId", command.uploadAttempt)
      await httpClient.postForm(`${EXPENSES}/${command.requestId}/attachments`, form)
      return await fetchDetail(command.requestId)
    } catch (error) {
      return rethrow(error)
    }
  },

  async removeAttachment(command) {
    try {
      await httpClient.delete(
        `${EXPENSES}/${command.requestId}/attachments/${command.attachmentId}`
      )
      return await fetchDetail(command.requestId)
    } catch (error) {
      return rethrow(error)
    }
  },

  // ── Comments ──────────────────────────────────────────────────────────────

  async addComment(command) {
    try {
      const created = await httpClient.post<ApiComment>(
        `${EXPENSES}/${command.requestId}/comments`,
        { body: command.body }
      )
      return toComment(created)
    } catch (error) {
      return rethrow(error)
    }
  },

  // ── Category commands ─────────────────────────────────────────────────────

  async createCategory(command) {
    try {
      const facts = await loadDirectory()
      const taken = new Set(facts.categories.map((row) => row.code))
      const created = await httpClient.post<ApiLookupValue>(
        CATEGORIES,
        {
          name: command.input.name,
          code: toLookupCode(command.input.name, taken),
          description: command.input.description,
          sortOrder: nextSortOrder(facts.categories),
        }
      )
      dropDirectoryCache()
      return toCategorySummary(created, 0)
    } catch (error) {
      return rethrow(error)
    }
  },

  async updateCategory(command) {
    try {
      const updated = await httpClient.patch<ApiLookupValue>(
        `${CATEGORIES}/${command.categoryId}`,
        {
          expectedVersion: command.expectedVersion,
          name: command.input.name,
          description: command.input.description,
        }
      )
      const facts = await loadDirectory()
      const count = facts.subCategories.filter(
        (row) => row.parentValueId === command.categoryId
      ).length
      dropDirectoryCache()
      return toCategorySummary(updated, count)
    } catch (error) {
      return rethrow(error)
    }
  },

  async setCategoryStatus(command) {
    try {
      const updated = await httpClient.patch<ApiLookupValue>(
        `${CATEGORIES}/${command.categoryId}/status`,
        { expectedVersion: command.expectedVersion, status: command.status }
      )
      dropDirectoryCache()
      return toCategorySummary(updated, 0)
    } catch (error) {
      return rethrow(error)
    }
  },

  async createSubCategory(command) {
    try {
      const facts = await loadDirectory()
      const taken = new Set(facts.subCategories.map((row) => row.code))
      const created = await httpClient.post<ApiLookupValue>(
        SUBCATEGORIES,
        {
          name: command.input.name,
          code: toLookupCode(command.input.name, taken),
          description: command.input.description,
          sortOrder: nextSortOrder(facts.subCategories),
          parentValueId: command.categoryId,
        }
      )
      const label = facts.directory.categoryLabel(command.categoryId)
      dropDirectoryCache()
      return toSubCategorySummary(created, label)
    } catch (error) {
      return rethrow(error)
    }
  },

  async updateSubCategory(command) {
    try {
      const updated = await httpClient.patch<ApiLookupValue>(
        `${SUBCATEGORIES}/${command.subCategoryId}`,
        {
          expectedVersion: command.expectedVersion,
          name: command.input.name,
          description: command.input.description,
        }
      )
      const facts = await loadDirectory()
      const label = updated.parentValueId
        ? facts.directory.categoryLabel(updated.parentValueId)
        : ""
      dropDirectoryCache()
      return toSubCategorySummary(updated, label)
    } catch (error) {
      return rethrow(error)
    }
  },

  async setSubCategoryStatus(command) {
    try {
      const updated = await httpClient.patch<ApiLookupValue>(
        `${SUBCATEGORIES}/${command.subCategoryId}/status`,
        { expectedVersion: command.expectedVersion, status: command.status }
      )
      const facts = await loadDirectory()
      const label = updated.parentValueId
        ? facts.directory.categoryLabel(updated.parentValueId)
        : ""
      dropDirectoryCache()
      return toSubCategorySummary(updated, label)
    } catch (error) {
      return rethrow(error)
    }
  },

  async resolveCategory(categoryId) {
    try {
      const facts = await loadDirectory()
      const row = facts.categories.find((entry) => entry.id === categoryId)
      if (!row) return undefined
      const count = facts.subCategories.filter(
        (entry) => entry.parentValueId === categoryId
      ).length
      return toCategorySummary(row, count)
    } catch (error) {
      return rethrow(error)
    }
  },

  async resolveSubCategory(subCategoryId) {
    try {
      const facts = await loadDirectory()
      const row = facts.subCategories.find((entry) => entry.id === subCategoryId)
      if (!row) return undefined
      return toSubCategorySummary(
        row,
        row.parentValueId ? facts.directory.categoryLabel(row.parentValueId) : ""
      )
    } catch (error) {
      return rethrow(error)
    }
  },
}

// ── Local helpers ───────────────────────────────────────────────────────────

function matchesCategoryQuery(
  row: ApiLookupValue,
  query: { search?: string; statuses?: string[]; activeOnly?: boolean }
): boolean {
  const status = toCategoryStatus(row.status)
  if (query.activeOnly && status !== "active") return false
  if (query.statuses?.length && !query.statuses.includes(status)) return false
  if (query.search && !row.name.toLowerCase().includes(query.search.toLowerCase()))
    return false
  return true
}

/** Categories are filtered client-side, so their paging is too. */
function paginate<T>(rows: T[], page: number, pageSize: number): Paginated<T> {
  const total = rows.length
  const size = Math.max(1, pageSize)
  const current = Math.max(1, page)
  return {
    items: rows.slice((current - 1) * size, current * size),
    total,
    page: current,
    pageSize: size,
    totalPages: Math.max(1, Math.ceil(total / size)),
  }
}

