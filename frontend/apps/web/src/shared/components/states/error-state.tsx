"use client"

import { CircleAlert } from "lucide-react"
import { Button } from "@workspace/ui/components/button"

export function ErrorState({ message = "تعذر تحميل المحتوى", onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <section role="alert" className="border-destructive/30 bg-card flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border p-8 text-center">
      <CircleAlert className="text-destructive size-8" aria-hidden />
      <h2 className="font-medium">{message}</h2>
      {onRetry && <Button onClick={onRetry}>إعادة المحاولة</Button>}
    </section>
  )
}
