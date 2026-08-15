"use client"

import { useMockPermission } from "@/features/organization-settings/hooks/use-mock-permission"
import type { AdmissionDocument } from "../types/domain"
import { AdmissionDocumentCard } from "../components/admission-document-card"
export function AdmissionDocumentsSection({
  documents,
  onUpload,
  onReplace,
  onVerify,
  onWithdraw,
}: {
  documents: AdmissionDocument[]
  onUpload: (document: AdmissionDocument, file: File) => void
  onReplace: (document: AdmissionDocument, file: File, reason: string) => void
  onVerify: (
    document: AdmissionDocument,
    decision: "verified" | "rejected",
    reason?: string
  ) => void
  onWithdraw: (document: AdmissionDocument, reason: string) => void
}) {
  const canManage = useMockPermission("admissions.documents.manage"),
    canVerify = useMockPermission("admissions.documents.verify")
  return (
    <section aria-labelledby="documents-title">
      <h2
        id="documents-title"
        className="font-heading text-lg font-bold text-brand-navy dark:text-foreground"
      >
        المستندات المطلوبة
      </h2>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        {documents.map((document) => (
          <AdmissionDocumentCard
            key={document.id}
            document={document}
            canManage={canManage}
            canVerify={canVerify}
            onUpload={(file) => onUpload(document, file)}
            onReplace={(file, reason) => onReplace(document, file, reason)}
            onVerify={(decision, reason) =>
              onVerify(document, decision, reason)
            }
            onWithdraw={(reason) => onWithdraw(document, reason)}
          />
        ))}
      </div>
    </section>
  )
}
