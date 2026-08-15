"use client"

import { Card } from "@/shared/components/layout/card"
import { Section } from "@/shared/components/layout/section"
import { LoadingState } from "@/shared/components/states/loading-state"
import { ErrorState } from "@/shared/components/states/error-state"
import { Button } from "@workspace/ui/components/button"
import type { StudentFinancialSummaryResult } from "../types/domain"
import { financialCopy, studentSectionsCopy } from "../config/students-copy"
import { formatMoney } from "@/shared/utils/money"
import { formatDate } from "../utils/student-format"
import { StudentBidiValue, StudentForbiddenState } from "./student-area-states"

/**
 * Read-only financial overview.
 *
 * Absence is never rendered as zero: only the `available` variant carries numbers,
 * and every other state says explicitly why there is nothing to show (spec FR-027).
 * There is no payment, refund, adjustment, installment, or schedule action here —
 * those belong to Student Finance (FR-026).
 */
export function StudentFinancialSummary({
  result,
  loading,
  error,
  onRetry,
}: {
  result?: StudentFinancialSummaryResult
  loading: boolean
  error?: unknown
  onRetry?: () => void
}) {
  return (
    <Section title={studentSectionsCopy.financial}>
      {loading ? (
        <LoadingState label="جارٍ تحميل الملخص المالي" />
      ) : error ? (
        <ErrorState
          message={financialCopy.unavailable["source-error"]}
          onRetry={onRetry}
        />
      ) : !result || result.state === "forbidden" ? (
        <StudentForbiddenState />
      ) : result.state === "unavailable" ? (
        <Card className="space-y-3">
          <p role="status" className="text-muted-foreground">
            {financialCopy.unavailable[result.reason]}
          </p>
          {onRetry && (
            <Button variant="outline" onClick={onRetry}>
              إعادة المحاولة
            </Button>
          )}
        </Card>
      ) : (
        <Card className="space-y-4">
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Figure
              label={financialCopy.totalFees}
              value={formatMoney(result.summary.totalFees)}
            />
            <Figure
              label={financialCopy.paidAmount}
              value={formatMoney(result.summary.paidAmount)}
            />
            <Figure
              label={financialCopy.remainingBalance}
              value={formatMoney(result.summary.remainingBalance)}
            />
            <Figure
              label={financialCopy.activeInstallments}
              value={String(result.summary.activeInstallments)}
            />
          </dl>
          <p className="text-muted-foreground text-xs">
            {financialCopy.asOf}:{" "}
            <StudentBidiValue>
              {formatDate(result.summary.asOf)}
            </StudentBidiValue>{" "}
            · {financialCopy.readOnlyNotice}
          </p>
        </Card>
      )}
    </Section>
  )
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-1 text-lg font-semibold">
        <StudentBidiValue>{value}</StudentBidiValue>
      </dd>
    </div>
  )
}
