"use client"

import { Check, Eye, FileX2, RefreshCw, X } from "lucide-react"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import type { AdmissionDocument } from "../types/domain"

export function AdmissionDocumentActions({
  document,
  canManage,
  canVerify,
  onReplace,
  onWithdraw,
  onVerify,
  onReject,
}: {
  document: AdmissionDocument
  canManage: boolean
  canVerify: boolean
  onReplace: () => void
  onWithdraw: () => void
  onVerify: () => void
  onReject: () => void
}) {
  if (!document.currentVersion) return null
  return (
    <div className="flex flex-wrap gap-2">
      {/*
        Rendered as a link rather than a button: the file lives at its own URL,
        so opening it in a new tab is the browser's job. As a plain button this
        carried no handler at all and did nothing when clicked.
      */}
      {document.currentVersion.previewUrl ? (
        <a
          href={document.currentVersion.previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`معاينة ${document.requirement.label}`}
          className={buttonVariants({ size: "sm", variant: "ghost" })}
        >
          <Eye aria-hidden />
          معاينة
        </a>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          disabled
          aria-label={`معاينة ${document.requirement.label} غير متاحة`}
        >
          <Eye aria-hidden />
          معاينة
        </Button>
      )}
      {canManage && (
        <>
          <Button size="sm" variant="outline" onClick={onReplace}>
            <RefreshCw aria-hidden />
            استبدال
          </Button>
          <Button size="sm" variant="ghost" onClick={onWithdraw}>
            <FileX2 aria-hidden />
            سحب
          </Button>
        </>
      )}
      {canVerify && document.state === "pending" && (
        <>
          <Button size="sm" variant="outline" onClick={onVerify}>
            <Check aria-hidden />
            اعتماد
          </Button>
          <Button size="sm" variant="destructive" onClick={onReject}>
            <X aria-hidden />
            رفض
          </Button>
        </>
      )}
    </div>
  )
}
