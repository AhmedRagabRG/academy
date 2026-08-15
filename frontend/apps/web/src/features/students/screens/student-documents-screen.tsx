"use client"

import { useState } from "react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/shared/components/feedback/confirm-dialog"
import type { StudentDocumentId, StudentId } from "../types/common"
import type { StudentDocument } from "../types/domain"
import { documentActionsCopy, studentsCopy } from "../config/students-copy"
import { studentsPermissions } from "../config/students-permissions"
import { currentVersion, sortDocuments } from "../utils/student-documents"
import { useStudentDetail } from "../hooks/use-student-detail"
import {
  useArchiveStudentDocument,
  useReplaceStudentDocument,
  useStudentDocuments,
  useUploadStudentDocument,
} from "../hooks/use-student-documents"
import { StudentAreaState } from "../components/student-area-states"
import { StudentDocumentCard } from "../components/student-document-card"

/** A stable attempt id makes a retried upload resolve to the same version. */
const newAttemptId = () =>
  `attempt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

export function StudentDocumentsScreen({ studentId }: { studentId: string }) {
  const id = studentId as StudentId
  const detail = useStudentDetail(id)
  const documents = useStudentDocuments(id)
  const upload = useUploadStudentDocument(id)
  const replace = useReplaceStudentDocument(id)
  const archive = useArchiveStudentDocument(id)
  const [archiveTarget, setArchiveTarget] = useState<StudentDocumentId>()

  const canManage =
    (detail.data?.permissions.documentsManage ?? false) &&
    detail.data?.status !== "archived"
  const pending = upload.isPending || replace.isPending || archive.isPending

  /**
   * The stored file's URL, which the API now publishes for every version — the
   * bytes were always there, they simply were not being reported. A version
   * without one is still possible (a failed upload), so the fallback stays,
   * narrowed to that case rather than claiming storage does not exist.
   */
  const openFile = (document: StudentDocument, download: boolean) => {
    const url = currentVersion(document)?.previewUrl
    if (!url) {
      toast.info(`لا يوجد ملف محفوظ لهذا المستند (${document.type.label}).`)
      return
    }
    if (!download) {
      window.open(url, "_blank", "noopener,noreferrer")
      return
    }
    const link = window.document.createElement("a")
    link.href = url
    link.download = currentVersion(document)?.fileName ?? document.type.label
    link.click()
  }

  return (
    <StudentAreaState
      permission={studentsPermissions.documentsView}
      loading={detail.isLoading || documents.isLoading}
      error={documents.error}
      onRetry={() => void documents.refetch()}
      loadingLabel="جارٍ تحميل المستندات"
    >
      <div className="space-y-4">
        {detail.data?.status === "archived" && (
          <p role="status" className="text-muted-foreground text-sm">
            {studentsCopy.archivedReadOnly}
          </p>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          {sortDocuments(documents.data ?? []).map((document) => (
            <StudentDocumentCard
              key={document.id}
              document={document}
              canManage={canManage}
              pending={pending}
              onPreview={() => openFile(document, false)}
              onDownload={() => openFile(document, true)}
              onArchive={() => setArchiveTarget(document.id)}
              onUpload={(file) =>
                upload.mutate({
                  studentId: id,
                  typeKey: document.type.key,
                  file,
                  uploadAttemptId: newAttemptId(),
                  expectedVersion: detail.data!.version,
                })
              }
              onReplace={(file) =>
                replace.mutate({
                  studentId: id,
                  documentId: document.id,
                  file,
                  uploadAttemptId: newAttemptId(),
                  expectedVersion: detail.data!.version,
                })
              }
            />
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={archiveTarget !== undefined}
        title={documentActionsCopy.archiveTitle}
        description={documentActionsCopy.archiveDescription}
        confirmLabel={documentActionsCopy.archive}
        pending={archive.isPending}
        onClose={() => setArchiveTarget(undefined)}
        onConfirm={() => {
          if (!archiveTarget || !detail.data) return
          archive.mutate(
            {
              studentId: id,
              documentId: archiveTarget,
              expectedVersion: detail.data.version,
            },
            { onSettled: () => setArchiveTarget(undefined) }
          )
        }}
      />
    </StudentAreaState>
  )
}
