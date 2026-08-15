"use client"

import { Button } from "@workspace/ui/components/button"

const labels: Record<string, string> = {
  branches: "الفروع",
  documents: "متطلبات المستندات",
  financials: "التجهيز المالي",
  readiness: "جاهزية الطلب",
}
export function AcademicSelectionChangeDialog({
  consequences,
  onConfirm,
  onCancel,
}: {
  consequences: string[]
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="selection-change-title"
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
    >
      <div className="w-full max-w-md space-y-4 rounded-lg border bg-card p-6">
        <h2
          id="selection-change-title"
          className="font-heading text-lg font-bold"
        >
          تأكيد تغيير الاختيار الأكاديمي
        </h2>
        <p className="text-sm text-muted-foreground">
          سيتم إعادة تقييم البيانات التالية:
        </p>
        <ul className="list-inside list-disc text-sm">
          {consequences.map((item) => (
            <li key={item}>{labels[item] ?? item}</li>
          ))}
        </ul>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            إلغاء
          </Button>
          <Button onClick={onConfirm}>تأكيد التغيير</Button>
        </div>
      </div>
    </div>
  )
}
