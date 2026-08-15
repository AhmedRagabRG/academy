/**
 * Every Accounting permission key.
 *
 * Submitting, starting a review, deciding, marking paid, and cancelling are
 * deliberately separate keys. That separation is the module's internal financial
 * control and it only means anything if the keys are distinct (spec FR-022a,
 * FR-027): an Executive Manager holds every read key and no decision key, which
 * is what makes "visibility without participation" enforceable rather than a UI
 * convention.
 */
export const accountingPermissions = {
  view: "accounting.view",
  dashboardView: "accounting.dashboard.view",
  requestsView: "accounting.requests.view",
  requestsCreate: "accounting.requests.create",
  requestsUpdate: "accounting.requests.update",
  requestsSubmit: "accounting.requests.submit",
  requestsReview: "accounting.requests.review",
  requestsDecide: "accounting.requests.decide",
  requestsMarkPaid: "accounting.requests.markPaid",
  requestsCancel: "accounting.requests.cancel",
  attachmentsManage: "accounting.attachments.manage",
  commentsAdd: "accounting.comments.add",
  categoriesView: "accounting.categories.view",
  categoriesManage: "accounting.categories.manage",
  historyView: "accounting.history.view",
  export: "accounting.export",
} as const

export type AccountingPermission =
  (typeof accountingPermissions)[keyof typeof accountingPermissions]

export const allAccountingPermissions: readonly AccountingPermission[] =
  Object.values(accountingPermissions)

/** Which permission gates each area of the module. */
export const accountingAreaPermission = {
  dashboard: accountingPermissions.dashboardView,
  requests: accountingPermissions.requestsView,
  requestDetail: accountingPermissions.requestsView,
  categories: accountingPermissions.categoriesView,
  subCategories: accountingPermissions.categoriesView,
  history: accountingPermissions.historyView,
} as const

export type AccountingArea = keyof typeof accountingAreaPermission

/**
 * The read-only set. A user holding exactly these can see everything and change
 * nothing — the Executive Manager's oversight role (spec FR-022).
 */
export const oversightPermissions: readonly AccountingPermission[] = [
  accountingPermissions.view,
  accountingPermissions.dashboardView,
  accountingPermissions.requestsView,
  accountingPermissions.categoriesView,
  accountingPermissions.historyView,
  accountingPermissions.export,
]
