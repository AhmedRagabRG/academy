import type { StudentDocument } from "../types/domain"
import { versionHistory } from "../utils/student-documents"
import { formatDateTime, formatFileSize } from "../utils/student-format"
import { StudentBidiValue } from "./student-area-states"

/**
 * Every version ever uploaded, newest first. Replacement appends; nothing is ever
 * removed, so a previous version stays retrievable (spec FR-019).
 */
export function StudentDocumentHistory({
  document,
}: {
  document: StudentDocument
}) {
  const versions = versionHistory(document)
  if (versions.length === 0) return null

  return (
    <div className="border-border rounded-lg border p-3">
      <h4 className="mb-2 text-sm font-medium">سجل النسخ</h4>
      <ol className="space-y-2 text-sm">
        {versions.map((version) => (
          <li
            key={version.id}
            className="flex flex-wrap items-baseline justify-between gap-2"
          >
            <span>
              النسخة {version.versionNumber}
              {version.id === document.currentVersionId && (
                <span className="text-muted-foreground"> (الحالية)</span>
              )}{" "}
              — <StudentBidiValue>{version.fileName}</StudentBidiValue>
            </span>
            <span className="text-muted-foreground text-xs">
              {formatFileSize(version.size)} ·{" "}
              <StudentBidiValue>
                {formatDateTime(version.uploadedAt)}
              </StudentBidiValue>{" "}
              · {version.uploadedBy.name}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
