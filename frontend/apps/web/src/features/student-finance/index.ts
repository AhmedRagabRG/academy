export { studentFinanceNavigation } from "./config/navigation"
export {
  financePermissions,
  allFinancePermissions,
  financeAreaPermission,
} from "./config/finance-permissions"
export type {
  FinancePermission,
  FinanceArea,
} from "./config/finance-permissions"

export { FinanceDashboardScreen } from "./screens/finance-dashboard-screen"
export { StudentFinanceWorkspaceScreen } from "./screens/student-finance-workspace-screen"
export { InvoicesScreen } from "./screens/invoices-screen"
export { CreateInvoiceScreen } from "./screens/create-invoice-screen"
export { InvoiceDetailScreen } from "./screens/invoice-detail-screen"
export { InvoicePrintScreen } from "./screens/invoice-print-screen"
export { PaymentsScreen } from "./screens/payments-screen"
export { InstallmentsScreen } from "./screens/installments-screen"
export { RefundsScreen } from "./screens/refunds-screen"

export { studentFinanceService } from "./services/active-student-finance-service"
export { financeScenarios } from "./services/mock-scenario-controller"
export { studentFinanceWorkspaceTab } from "./config/workspace-tab"
/** Handed to Student Management through its registration point (see module-registry). */
export { studentFinanceReaderAdapter } from "./services/student-finance-reader-adapter"
export type { StudentFinanceService } from "./services/student-finance-service"
export type {
  InvoiceSummary,
  InvoiceDetail,
  StudentFinancialProfile,
  AccountingContext,
} from "./types/projections"

export { FinanceError, isFinanceError } from "./services/finance-error"
export type { FinanceErrorCode } from "./services/finance-error"

export type {
  Invoice,
  InvoiceFigures,
  Installment,
  InstallmentPlan,
  Payment,
  Discount,
  Scholarship,
  FinancialAdjustment,
  Refund,
  FinanceTimelineEvent,
  FinanceLookups,
} from "./types/domain"
export type {
  InvoiceId,
  InvoiceStatus,
  InstallmentStatus,
  FinancialStatus,
  RefundStatus,
} from "./types/common"
