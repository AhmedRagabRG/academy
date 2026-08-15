"use client"

import type { BulkStatusOutcome } from "../types/projections"
import { listCopy } from "../config/students-copy"
import { StudentBidiValue } from "./student-area-states"

/**
 * Per-record bulk results. Refusals are listed individually so a partial failure
 * is never hidden behind an aggregate (spec FR-035).
 */
export function StudentBulkOutcome({
  outcomes,
}: {
  outcomes: readonly BulkStatusOutcome[]
}) {
  if (outcomes.length === 0) return null
  const applied = outcomes.filter((outcome) => outcome.outcome === "applied")
  const refused = outcomes.filter((outcome) => outcome.outcome === "refused")

  return (
    <section
      aria-live="polite"
      className="border-border bg-muted/40 mt-4 space-y-3 rounded-lg border p-4 text-sm"
    >
      <p className="font-medium">
        {listCopy.bulkApplied}: {applied.length} · {listCopy.bulkRefused}:{" "}
        {refused.length}
      </p>
      {refused.length > 0 && (
        <ul className="space-y-1">
          {refused.map((outcome) => (
            <li key={outcome.studentId} className="text-muted-foreground">
              <StudentBidiValue className="font-medium">
                {outcome.studentCode}
              </StudentBidiValue>{" "}
              — {outcome.message}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
