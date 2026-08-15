import { Card } from "@/shared/components/layout/card"
import { EmptyState } from "@/shared/components/states/empty-state"
import type { ScholarshipSummary } from "../types/projections"
import { scholarshipCopy } from "../config/finance-copy"
import { FinanceBidiValue } from "./finance-area-states"
import { formatFinanceDate } from "./discount-history"

const coverageLabel: Record<ScholarshipSummary["coverage"], string> = {
  "full-tuition": scholarshipCopy.fullTuition,
  "partial-tuition": scholarshipCopy.partialTuition,
}

/**
 * Awarded scholarships with their coverage and approval information.
 *
 * Coverage is shown rather than inferred from the figure, because a full-tuition
 * award and a 100% partial award are the same number and different decisions.
 */
export function ScholarshipHistory({
  scholarships,
}: {
  scholarships: readonly ScholarshipSummary[]
}) {
  if (scholarships.length === 0)
    return <EmptyState title={scholarshipCopy.emptyTitle} />

  return (
    <Card>
      <ul className="space-y-3 text-sm">
        {scholarships.map((scholarship) => (
          <li
            key={scholarship.id}
            className="flex flex-wrap justify-between gap-2"
          >
            <div className="min-w-0">
              <p className="font-medium">
                {scholarship.name}{" "}
                <span className="text-muted-foreground font-normal">
                  ·{" "}
                  {scholarship.coverage === "full-tuition" ? (
                    coverageLabel[scholarship.coverage]
                  ) : (
                    <FinanceBidiValue>
                      {scholarship.kind === "percentage"
                        ? `${scholarship.value}%`
                        : scholarship.value}
                    </FinanceBidiValue>
                  )}
                </span>
              </p>
            </div>
            <p className="text-muted-foreground text-xs">
              {scholarshipCopy.approvedBy} {scholarship.approvedByName} ·{" "}
              <FinanceBidiValue>
                {formatFinanceDate(scholarship.approvedAt)}
              </FinanceBidiValue>
            </p>
          </li>
        ))}
      </ul>
    </Card>
  )
}
