import { StudentBidiValue } from "./student-area-states"

export interface DetailEntry {
  label: string
  value?: string | number
  /** Isolate mixed-direction values such as codes, phones, dates, and identifiers. */
  bidi?: boolean
}

/**
 * A labelled description list. Uses `dl`/`dt`/`dd` so screen readers announce the
 * label-value relationship rather than two unrelated runs of text.
 */
export function StudentDetailList({
  entries,
}: {
  entries: readonly DetailEntry[]
}) {
  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map((entry) => (
        <div key={entry.label} className="min-w-0">
          <dt className="text-muted-foreground text-xs">{entry.label}</dt>
          <dd className="mt-1 break-words">
            {entry.value === undefined || entry.value === "" ? (
              <span className="text-muted-foreground">—</span>
            ) : entry.bidi ? (
              <StudentBidiValue className="font-medium">
                {entry.value}
              </StudentBidiValue>
            ) : (
              <span className="font-medium">{entry.value}</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}
