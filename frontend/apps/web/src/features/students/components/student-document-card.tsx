"use client"

import { useState } from "react"
import { Archive, Download, Eye, History, RefreshCw } from "lucide-react"
import type { Accept } from "react-dropzone"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@/shared/components/layout/card"
import { StatusBadge } from "@/shared/components/feedback/status-badge"
import { FileDropzone } from "@/shared/components/file-upload/file-dropzone"
import type { StudentDocument } from "../types/domain"
import { documentActionsCopy, documentStateCopy } from "../config/students-copy"
import { currentVersion, validateFileAgainstType } from "../utils/student-documents"
import { formatDateTime, formatFileSize } from "../utils/student-format"
import { studentsErrorMessage } from "../services/students-error"
import { StudentBidiValue } from "./student-area-states"
import { StudentDocumentHistory } from "./student-document-history"

const tone = {
  present: "success",
  missing: "warning",
  archived: "neutral",
} as const

const toAccept = (mimeTypes: readonly string[]): Accept =>
  Object.fromEntries(mimeTypes.map((type) => [type, []]))

/**
 * One configured document type. Upload, replace, preview, download, and archive
 * live here; there is deliberately no delete — archiving keeps every version
 * retrievable (spec FR-019).
 */
export function StudentDocumentCard({
  document,
  canManage,
  pending,
  onUpload,
  onReplace,
  onArchive,
  onPreview,
  onDownload,
}: {
  document: StudentDocument
  canManage: boolean
  pending: boolean
  onUpload: (file: File) => void
  onReplace: (file: File) => void
  onArchive: () => void
  onPreview: () => void
  onDownload: () => void
}) {
  const [rejection, setRejection] = useState<string>()
  const [historyOpen, setHistoryOpen] = useState(false)
  const version = currentVersion(document)
  const isArchived = document.state === "archived"
  const hasFile = Boolean(version) && !isArchived

  const handleFiles = (files: File[]) => {
    const file = files[0]
    if (!file) return
    // Validate against the same pure rule the service enforces, so the employee
    // gets immediate feedback rather than a round trip.
    const failure = validateFileAgainstType(file, document.type)
    if (failure) {
      setRejection(studentsErrorMessage(failure))
      return
    }
    setRejection(undefined)
    if (hasFile) onReplace(file)
    else onUpload(file)
  }

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-medium">
            {document.type.label}
            {document.type.required && (
              <span className="text-muted-foreground text-xs"> (مطلوب)</span>
            )}
          </h3>
          {version && (
            <p className="text-muted-foreground mt-1 text-sm">
              <StudentBidiValue>{version.fileName}</StudentBidiValue> ·{" "}
              {formatFileSize(version.size)} · النسخة {version.versionNumber} ·{" "}
              <StudentBidiValue>
                {formatDateTime(version.uploadedAt)}
              </StudentBidiValue>{" "}
              · {version.uploadedBy.name}
            </p>
          )}
        </div>
        <StatusBadge
          label={documentStateCopy[document.state]}
          tone={tone[document.state]}
        />
      </div>

      {isArchived && document.archiveReason && (
        <p className="text-muted-foreground text-sm">
          سبب الأرشفة: {document.archiveReason}
        </p>
      )}

      {version && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onPreview}>
            <Eye aria-hidden />
            {documentActionsCopy.preview}
          </Button>
          <Button variant="outline" onClick={onDownload}>
            <Download aria-hidden />
            {documentActionsCopy.download}
          </Button>
          <Button
            variant="outline"
            onClick={() => setHistoryOpen((open) => !open)}
            aria-expanded={historyOpen}
          >
            <History aria-hidden />
            {documentActionsCopy.history} ({document.versions.length})
          </Button>
          {canManage && !isArchived && (
            <Button variant="outline" onClick={onArchive} disabled={pending}>
              <Archive aria-hidden />
              {documentActionsCopy.archive}
            </Button>
          )}
        </div>
      )}

      {historyOpen && <StudentDocumentHistory document={document} />}

      {canManage && !isArchived && (
        <FileDropzone
          label={hasFile ? documentActionsCopy.replace : documentActionsCopy.upload}
          accept={toAccept(document.type.allowedMimeTypes)}
          maxSize={document.type.maxBytes}
          disabled={pending}
          error={rejection}
          status={pending ? "جارٍ الرفع..." : undefined}
          onFiles={handleFiles}
          onReject={(rejections) => {
            const code = rejections[0]?.errors[0]?.code
            setRejection(
              studentsErrorMessage(
                code === "file-too-large"
                  ? "file-too-large"
                  : "unsupported-file-type"
              )
            )
          }}
        />
      )}

      {hasFile && canManage && (
        <p className="text-muted-foreground flex items-center gap-1 text-xs">
          <RefreshCw className="size-3" aria-hidden />
          الاستبدال ينشئ نسخة جديدة ويحتفظ بالنسخ السابقة.
        </p>
      )}
    </Card>
  )
}
