import type {
  StudentFinancialSummaryResult,
  StudentFinanceReader,
} from "@/features/students"
import { studentFinanceService } from "./active-student-finance-service"
import { isFinanceError } from "./finance-error"

/**
 * Student Finance's implementation of Student Management's reader port.
 *
 * The dependency runs one way only — this module imports Students, never the
 * reverse — and this adapter is handed to Students through its registration
 * point rather than being imported by it (plan.md, Complexity Tracking).
 *
 * The mapping's whole job is to keep three states apart that are easy to collapse
 * into one: real figures that happen to be zero, a refusal, and an unreachable
 * source. A student with no invoices genuinely owes nothing — that is `available`
 * with zeroes, not `unavailable` (spec FR-027).
 */
export const studentFinanceReaderAdapter: StudentFinanceReader = {
  async getFinancialSummary(
    studentId,
    signal
  ): Promise<StudentFinancialSummaryResult> {
    try {
      const profile = await studentFinanceService.getStudentFinancialProfile(
        studentId,
        signal
      )
      return {
        state: "available",
        summary: {
          totalFees: profile.totals.totalFees,
          paidAmount: profile.totals.paidAmount,
          remainingBalance: profile.totals.remainingBalance,
          activeInstallments: profile.outstandingInstallments,
          asOf: profile.asOf,
        },
      }
    } catch (error) {
      if (isFinanceError(error)) {
        // A permission refusal is not an outage, and must not read as one.
        if (error.code === "forbidden") return { state: "forbidden" }
        if (error.code === "out-of-scope") return { state: "forbidden" }
        return { state: "unavailable", reason: "source-error" }
      }
      return { state: "unavailable", reason: "source-error" }
    }
  },
}
