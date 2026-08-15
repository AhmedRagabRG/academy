"use client"
import { useEffect, useRef } from "react"
import { Button } from "@workspace/ui/components/button"

export function ConfirmDialog({ open, title, description, confirmLabel = "تأكيد", pending = false, destructive = false, onConfirm, onClose }: { open: boolean; title: string; description: string; confirmLabel?: string; pending?: boolean; destructive?: boolean; onConfirm: () => void; onClose: () => void }) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (!open) return
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    cancelRef.current?.focus()
    return () => triggerRef.current?.focus()
  }, [open])
  if (!open) return null
  return <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-title"><button className="absolute inset-0 bg-black/50" onClick={onClose} aria-label="إغلاق" /><div className="bg-card relative w-full max-w-md rounded-xl border p-6 shadow-xl"><h2 id="confirm-title" className="text-lg font-semibold">{title}</h2><p className="text-muted-foreground mt-2">{description}</p><div className="mt-6 flex justify-end gap-2"><Button ref={cancelRef} variant="outline" onClick={onClose}>إلغاء</Button><Button className={destructive ? "bg-destructive text-white" : ""} disabled={pending} onClick={onConfirm}>{pending ? "جارٍ التنفيذ..." : confirmLabel}</Button></div></div></div>
}
