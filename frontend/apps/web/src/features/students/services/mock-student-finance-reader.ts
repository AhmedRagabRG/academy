import type { StudentId } from "../types/common"
import type { StudentFinancialSummaryResult } from "../types/domain"
import type { StudentFinanceReader } from "./students-dependency-readers"

/**
 * The wired default. Student Finance does not exist yet, so the honest answer is
 * "unavailable" — never zeroes presented as facts (spec FR-027).
 */
export const defaultStudentFinanceReader: StudentFinanceReader = {
  async getFinancialSummary(): Promise<StudentFinancialSummaryResult> {
    return { state: "unavailable", reason: "finance-module-absent" }
  },
}

const money = (amount: string, currency: string, precision: number) => ({
  amount,
  currency,
  precision,
})

/** Deterministic populated adapter used by fixtures and tests. */
export function createMockStudentFinanceReader(options?: {
  currency?: string
  precision?: number
  mode?: "available" | "unavailable" | "source-error" | "timeout"
}): StudentFinanceReader {
  const currency = options?.currency ?? "EGP"
  const precision = options?.precision ?? 2
  const mode = options?.mode ?? "available"
  return {
    async getFinancialSummary(
      studentId: StudentId
    ): Promise<StudentFinancialSummaryResult> {
      if (mode === "source-error")
        return { state: "unavailable", reason: "source-error" }
      if (mode === "timeout") return { state: "unavailable", reason: "timeout" }
      if (mode === "unavailable")
        return { state: "unavailable", reason: "finance-module-absent" }

      // Deterministic per student so fixtures and tests stay reproducible.
      const seed = [...String(studentId)].reduce(
        (total, character) => total + character.charCodeAt(0),
        0
      )
      const total = 12000 + (seed % 9) * 1500
      const paid = Math.round(total * (0.25 + (seed % 4) * 0.15))
      const remaining = total - paid
      return {
        state: "available",
        summary: {
          totalFees: money(total.toFixed(precision), currency, precision),
          paidAmount: money(paid.toFixed(precision), currency, precision),
          remainingBalance: money(
            remaining.toFixed(precision),
            currency,
            precision
          ),
          activeInstallments: remaining > 0 ? 1 + (seed % 4) : 0,
          asOf: "2026-07-31T00:00:00.000Z",
          sourceRevisionId: `finance-revision-${seed % 1000}`,
        },
      }
    },
  }
}
