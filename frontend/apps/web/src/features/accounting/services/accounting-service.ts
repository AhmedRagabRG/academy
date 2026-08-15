import type {
  ExpenseCategoryId,
  ExpenseRequestId,
  ExpenseSubCategoryId,
  Paginated,
} from "../types/common"
import type {
  AccountingConfiguration,
  ExpenseComment,
  HistoryEntry,
} from "../types/domain"
import type {
  AccountingDashboard,
  AccountingExportContext,
  ExpenseCategorySummary,
  ExpenseRequestDetail,
  ExpenseRequestSummary,
  ExpenseSubCategorySummary,
  ExportRow,
} from "../types/projections"
import type {
  AddCommentCommand,
  CancelRequestCommand,
  CategoryListQuery,
  CreateCategoryCommand,
  CreateRequestCommand,
  CreateSubCategoryCommand,
  DashboardQuery,
  DecideRequestCommand,
  ExpenseRequestListQuery,
  MarkPaidCommand,
  RemoveAttachmentCommand,
  SetCategoryStatusCommand,
  SetSubCategoryStatusCommand,
  StartReviewCommand,
  SubCategoryListQuery,
  SubmitRequestCommand,
  UpdateCategoryCommand,
  UpdateRequestCommand,
  UpdateSubCategoryCommand,
  UploadAttachmentCommand,
} from "../types/commands"

export interface AccountingLookups extends AccountingConfiguration {
  /** Active only — for pickers. */
  categories: ExpenseCategorySummary[]
  subCategories: ExpenseSubCategorySummary[]
  requesters: { value: string; label: string }[]
}

/**
 * The whole UI contract.
 *
 * Every screen depends on this and nothing else, so replacing the mock with a
 * REST client changes no screen. Every read takes an `AbortSignal` and every
 * command carries `expectedVersion` — the interface is already shaped for a
 * network boundary rather than needing reshaping when one arrives.
 *
 * **There is no delete here**, for any entity. `removeAttachment` is the only
 * removal and it is legal only while the request is editable (spec FR-015,
 * FR-033).
 */
export interface AccountingService {
  // ── Reads ─────────────────────────────────────────────────────────────────
  listRequests(
    query: ExpenseRequestListQuery,
    signal?: AbortSignal
  ): Promise<Paginated<ExpenseRequestSummary>>
  getRequest(
    requestId: ExpenseRequestId,
    signal?: AbortSignal
  ): Promise<ExpenseRequestDetail>
  listHistory(
    requestId: ExpenseRequestId,
    signal?: AbortSignal
  ): Promise<HistoryEntry[]>
  listComments(
    requestId: ExpenseRequestId,
    signal?: AbortSignal
  ): Promise<ExpenseComment[]>
  listCategories(
    query: CategoryListQuery,
    signal?: AbortSignal
  ): Promise<Paginated<ExpenseCategorySummary>>
  listSubCategories(
    query: SubCategoryListQuery,
    signal?: AbortSignal
  ): Promise<Paginated<ExpenseSubCategorySummary>>
  getDashboard(
    query: DashboardQuery,
    signal?: AbortSignal
  ): Promise<AccountingDashboard>
  lookups(signal?: AbortSignal): Promise<AccountingLookups>
  exportRequests(
    query: ExpenseRequestListQuery,
    signal?: AbortSignal
  ): Promise<ExportRow[]>
  getAccountingExportContext(
    query: ExpenseRequestListQuery,
    signal?: AbortSignal
  ): Promise<AccountingExportContext>

  // ── Request commands ──────────────────────────────────────────────────────
  createRequest(command: CreateRequestCommand): Promise<ExpenseRequestDetail>
  updateRequest(command: UpdateRequestCommand): Promise<ExpenseRequestDetail>
  submitRequest(command: SubmitRequestCommand): Promise<ExpenseRequestDetail>
  /**
   * Its own command, because it changes state. Opening a request's detail page
   * must not move it to Under Review — a read with a side effect would let an
   * observer silently claim a request (research R2).
   */
  startReview(command: StartReviewCommand): Promise<ExpenseRequestDetail>
  decideRequest(command: DecideRequestCommand): Promise<ExpenseRequestDetail>
  markPaid(command: MarkPaidCommand): Promise<ExpenseRequestDetail>
  cancelRequest(command: CancelRequestCommand): Promise<ExpenseRequestDetail>

  // ── Attachments ───────────────────────────────────────────────────────────
  uploadAttachment(
    command: UploadAttachmentCommand
  ): Promise<ExpenseRequestDetail>
  removeAttachment(
    command: RemoveAttachmentCommand
  ): Promise<ExpenseRequestDetail>

  // ── Comments ──────────────────────────────────────────────────────────────
  addComment(command: AddCommentCommand): Promise<ExpenseComment>

  // ── Category commands ─────────────────────────────────────────────────────
  createCategory(command: CreateCategoryCommand): Promise<ExpenseCategorySummary>
  updateCategory(command: UpdateCategoryCommand): Promise<ExpenseCategorySummary>
  setCategoryStatus(
    command: SetCategoryStatusCommand
  ): Promise<ExpenseCategorySummary>
  createSubCategory(
    command: CreateSubCategoryCommand
  ): Promise<ExpenseSubCategorySummary>
  updateSubCategory(
    command: UpdateSubCategoryCommand
  ): Promise<ExpenseSubCategorySummary>
  setSubCategoryStatus(
    command: SetSubCategoryStatusCommand
  ): Promise<ExpenseSubCategorySummary>

  /** Resolves a category for **display**, including archived ones (research R7). */
  resolveCategory(
    categoryId: ExpenseCategoryId,
    signal?: AbortSignal
  ): Promise<ExpenseCategorySummary | undefined>
  resolveSubCategory(
    subCategoryId: ExpenseSubCategoryId,
    signal?: AbortSignal
  ): Promise<ExpenseSubCategorySummary | undefined>
}
