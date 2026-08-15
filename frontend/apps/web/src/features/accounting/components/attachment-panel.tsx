"use client"

import { useState } from "react"
import { Eye, Paperclip, Trash2 } from "lucide-react"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import { Card } from "@/shared/components/layout/card"
import { EmptyState } from "@/shared/components/states/empty-state"
import { FileDropzone } from "@/shared/components/file-upload/file-dropzone"
import type { AttachmentKind } from "../types/common"
import type { ExpenseAttachment, AttachmentPolicy } from "../types/domain"
import { stagePendingUpload } from "../services/pending-uploads"
import { attachmentCopy } from "../config/accounting-copy"
import {
  dropzoneAccept,
  formatBytes,
  validateAttachment,
} from "../utils/attachment-rules"
import { AccountingBidiValue } from "./accounting-area-states"

const kindLabel: Record<AttachmentKind, string> = {
  invoice: attachmentCopy.invoice,
  receipt: attachmentCopy.receipt,
  "supporting-document": attachmentCopy.supportingDocument,
}

export interface UploadRequest {
  kind: AttachmentKind
  fileName: string
  mimeType: string
  sizeBytes: number
  uploadAttempt: string
}

/**
 * Attachments for a request.
 *
 * Refusals name the accepted types and the limit — a rejected file must say what
 * would have worked, not merely that this did not.
 */
export function AttachmentPanel({
  attachments,
  policy,
  editable,
  pending = false,
  onUpload,
  onRemove,
}: {
  attachments: readonly ExpenseAttachment[]
  policy: AttachmentPolicy
  editable: boolean
  pending?: boolean
  onUpload: (request: UploadRequest) => void
  onRemove: (attachmentId: ExpenseAttachment["id"]) => void
}) {
  const [kind, setKind] = useState<AttachmentKind>("invoice")
  const [error, setError] = useState<string | undefined>(undefined)

  const accept = (files: File[]) => {
    setError(undefined)
    for (const file of files) {
      const verdict = validateAttachment(
        { mimeType: file.type, sizeBytes: file.size },
        policy
      )
      if (!verdict.ok) {
        setError(
          verdict.code === "attachment-too-large"
            ? `${file.name}: الحجم يتجاوز ${verdict.limit}`
            : `${file.name}: ${attachmentCopy.acceptedTypes}`
        )
        continue
      }
      // A stable key per attempt, so a retry is a no-op rather than a duplicate.
      const uploadAttempt = `${file.name}:${file.size}:${file.lastModified}`
      // The command describes the file but cannot carry it. Staging the bytes
      // under the same token is what lets the API implementation send them.
      stagePendingUpload(uploadAttempt, file)
      onUpload({
        kind,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        uploadAttempt,
      })
    }
  }

  return (
    <div className="space-y-4">
      {editable ? (
        <Card className="space-y-3">
          <div className="space-y-2">
            <label htmlFor="attachment-kind" className="text-sm font-medium">
              {attachmentCopy.kind}
            </label>
            <select
              id="attachment-kind"
              value={kind}
              onChange={(event) => setKind(event.target.value as AttachmentKind)}
              className="border-input bg-background focus-visible:ring-ring h-10 w-full rounded-lg border px-3 outline-none focus-visible:ring-2 sm:w-64"
            >
              {(Object.keys(kindLabel) as AttachmentKind[]).map((value) => (
                <option key={value} value={value}>
                  {kindLabel[value]}
                </option>
              ))}
            </select>
          </div>
          <FileDropzone
            onFiles={accept}
            accept={dropzoneAccept(policy)}
            maxSize={policy.maxBytes}
            label={attachmentCopy.upload}
            status={`${attachmentCopy.acceptedTypes} · ${formatBytes(policy.maxBytes)}`}
            error={error}
            disabled={pending}
          />
        </Card>
      ) : (
        <p className="text-muted-foreground text-sm">{attachmentCopy.lockedNotice}</p>
      )}

      {attachments.length === 0 ? (
        <EmptyState title={attachmentCopy.emptyTitle} />
      ) : (
        <ul className="space-y-2">
          {attachments.map((attachment) => (
            <li key={attachment.id}>
              <Card className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Paperclip className="size-4 shrink-0" aria-hidden />
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      <AccountingBidiValue>{attachment.fileName}</AccountingBidiValue>
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {kindLabel[attachment.kind]} ·{" "}
                      <AccountingBidiValue>
                        {formatBytes(attachment.sizeBytes)}
                      </AccountingBidiValue>{" "}
                      · {attachmentCopy.uploadedBy} {attachment.uploadedBy.name}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {/*
                    A link, not a button: the file lives at its own URL, so
                    opening it in a new tab is the browser's job. Approving a
                    request means reading its evidence, so the control stays
                    visible — and disabled with a reason — when a stored file
                    has no address rather than disappearing.
                  */}
                  {attachment.previewUrl ? (
                    <a
                      href={attachment.previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${attachmentCopy.preview} ${attachment.fileName}`}
                      className={buttonVariants({ size: "sm", variant: "ghost" })}
                    >
                      <Eye aria-hidden />
                      {attachmentCopy.preview}
                    </a>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled
                      aria-label={`${attachmentCopy.preview} ${attachment.fileName} ${attachmentCopy.previewUnavailable}`}
                    >
                      <Eye aria-hidden />
                      {attachmentCopy.preview}
                    </Button>
                  )}
                  {editable && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() => onRemove(attachment.id)}
                    >
                      <Trash2 aria-hidden />
                      {attachmentCopy.remove}
                    </Button>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
