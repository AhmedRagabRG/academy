"use client"

import { useState } from "react"
import type { Accept, FileRejection } from "react-dropzone"
import { FileDropzone } from "@/shared/components/file-upload/file-dropzone"
import { StatusBadge } from "@/shared/components/feedback/status-badge"
import type { AdmissionDocument } from "../types/domain"
import { AdmissionDocumentActions } from "./admission-document-actions"
import { DocumentHistory } from "./document-history"
import { DocumentDecisionDialog } from "./document-decision-dialog"

/**
 * The picker's filter, built from the requirement the API publishes rather than
 * a fixed PDF/JPEG/PNG list — `personal-photo` accepts images only. An empty
 * list means the policy did not say, so the picker stays unfiltered and the
 * server remains the authority.
 */
const toAccept = (mimeTypes: readonly string[]): Accept | undefined =>
  mimeTypes.length
    ? Object.fromEntries(mimeTypes.map((type) => [type, []]))
    : undefined

const labels = {
  missing: "مفقود",
  uploading: "جارٍ الرفع",
  pending: "بانتظار المراجعة",
  verified: "معتمد",
  rejected: "مرفوض",
  withdrawn: "مسحوب",
}
export function AdmissionDocumentCard({
  document,
  canManage,
  canVerify,
  onUpload,
  onReplace,
  onVerify,
  onWithdraw,
}: {
  document: AdmissionDocument
  canManage: boolean
  canVerify: boolean
  onUpload: (file: File) => void
  onReplace: (file: File, reason: string) => void
  onVerify: (decision: "verified" | "rejected", reason?: string) => void
  onWithdraw: (reason: string) => void
}) {
  const [dialog, setDialog] = useState<"verify" | "reject" | "withdraw" | null>(
    null
  )
  const [replacing, setReplacing] = useState(false)
  // Without this the dropzone's rejections are dropped on the floor, and a file
  // the picker refused reads as a dead button rather than a rejected file.
  const [rejected, setRejected] = useState<string | undefined>(undefined)
  const explainRejection = (rejections: FileRejection[]) => {
    const reason = rejections[0]?.errors[0]?.code
    setRejected(
      reason === "file-too-large"
        ? "حجم الملف يتجاوز الحد المسموح به."
        : reason === "file-invalid-type"
          ? "نوع الملف غير مدعوم. المسموح: PDF أو JPG أو PNG."
          : "تعذر قبول الملف. اختر ملفًا آخر وحاول مجددًا."
    )
  }
  const tone =
    document.state === "verified"
      ? "success"
      : document.state === "rejected"
        ? "danger"
        : document.state === "pending"
          ? "warning"
          : "neutral"
  return (
    <article className="space-y-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-medium">{document.requirement.label}</h3>
          <p className="text-xs text-muted-foreground">
            {document.requirement.required ? "مطلوب" : "اختياري"}
          </p>
        </div>
        <StatusBadge label={labels[document.state]} tone={tone} />
      </div>
      {document.currentVersion ? (
        <>
          <p className="text-sm">
            <bdi dir="ltr">{document.currentVersion.fileName}</bdi> ·{" "}
            {(document.currentVersion.size / 1_000_000).toFixed(1)} MB
          </p>
          <AdmissionDocumentActions
            document={document}
            canManage={canManage}
            canVerify={canVerify}
            onReplace={() => setReplacing((value) => !value)}
            onWithdraw={() => setDialog("withdraw")}
            onVerify={() => setDialog("verify")}
            onReject={() => setDialog("reject")}
          />
          <DocumentHistory document={document} />
          {replacing && canManage && (
            <FileDropzone
              label={`استبدال ${document.requirement.label}`}
              maxSize={document.requirement.maxBytes}
              accept={toAccept(document.requirement.allowedMimeTypes)}
              onReject={explainRejection}
              error={rejected}
              onFiles={(files) => {
                const file = files[0]
                if (!file) return
                setRejected(undefined)
                onReplace(file, "استبدال نسخة المستند")
                setReplacing(false)
              }}
            />
          )}
        </>
      ) : canManage ? (
        <FileDropzone
          label={`رفع ${document.requirement.label}`}
          maxSize={document.requirement.maxBytes}
          accept={{
            "application/pdf": [".pdf"],
            "image/jpeg": [".jpg", ".jpeg"],
            "image/png": [".png"],
          }}
          onReject={explainRejection}
          error={rejected}
          onFiles={(files) => {
            const file = files[0]
            if (!file) return
            setRejected(undefined)
            onUpload(file)
          }}
        />
      ) : (
        <p className="text-sm text-muted-foreground">لم يتم رفع المستند</p>
      )}
      {dialog && (
        <DocumentDecisionDialog
          title={
            dialog === "verify"
              ? "اعتماد المستند"
              : dialog === "reject"
                ? "رفض المستند"
                : "سحب المستند"
          }
          reasonRequired={dialog !== "verify"}
          onCancel={() => setDialog(null)}
          onConfirm={(reason) => {
            if (dialog === "verify") onVerify("verified")
            else if (dialog === "reject") onVerify("rejected", reason)
            else onWithdraw(reason ?? "")
            setDialog(null)
          }}
        />
      )}
    </article>
  )
}
