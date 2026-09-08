"use client"

import { useEffect, useRef } from "react"

/** The modal shell shared by the pipeline and stage forms. */
export function PipelineModal({
  open,
  titleId,
  onClose,
  children,
}: {
  open: boolean
  titleId: string
  onClose: () => void
  children: React.ReactNode
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    triggerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    const firstField = panelRef.current?.querySelector<HTMLElement>(
      "input, select, textarea, button"
    )
    firstField?.focus()
    return () => triggerRef.current?.focus()
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4">
      <button
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
        aria-label="إغلاق"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative my-8 w-full max-w-lg rounded-xl border bg-card p-6 shadow-xl"
      >
        {children}
      </div>
    </div>
  )
}
