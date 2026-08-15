/**
 * Every Student Finance permission key.
 *
 * Recording a payment, approving a discount, approving a scholarship, and approving
 * a refund are deliberately separate keys — that separation is the module's main
 * internal financial control and only means anything if the keys are distinct
 * (spec FR-041).
 */
export const financePermissions = {
  view: "finance.view",
  invoicesView: "finance.invoices.view",
  invoicesCreate: "finance.invoices.create",
  invoicesUpdate: "finance.invoices.update",
  invoicesIssue: "finance.invoices.issue",
  invoicesCancel: "finance.invoices.cancel",
  installmentsManage: "finance.installments.manage",
  paymentsView: "finance.payments.view",
  paymentsRecord: "finance.payments.record",
  discountsApprove: "finance.discounts.approve",
  scholarshipsApprove: "finance.scholarships.approve",
  refundsView: "finance.refunds.view",
  refundsRecord: "finance.refunds.record",
  refundsApprove: "finance.refunds.approve",
  timelineView: "finance.timeline.view",
  export: "finance.export",
} as const

export type FinancePermission =
  (typeof financePermissions)[keyof typeof financePermissions]

export const allFinancePermissions: readonly FinancePermission[] =
  Object.values(financePermissions)

/** Which permission gates each finance area. */
export const financeAreaPermission = {
  dashboard: financePermissions.view,
  invoices: financePermissions.invoicesView,
  payments: financePermissions.paymentsView,
  installments: financePermissions.invoicesView,
  refunds: financePermissions.refundsView,
  timeline: financePermissions.timelineView,
  profile: financePermissions.view,
} as const

export type FinanceArea = keyof typeof financeAreaPermission
