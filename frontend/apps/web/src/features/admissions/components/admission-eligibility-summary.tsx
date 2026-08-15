import { CircleAlert, CircleCheck } from "lucide-react"
import type { EligibilityAssessment } from "../types/domain"

const reasonLabels: Record<string, string> = {
  "offering-inactive": "المنتج غير نشط",
  "batch-required": "يجب اختيار دفعة",
  "batch-forbidden": "هذا المنتج لا يستخدم دفعات",
  "batch-parent-mismatch": "الدفعة لا تتبع البرنامج",
  "registration-not-open": "التسجيل غير مفتوح",
  "outside-registration-window": "خارج فترة التسجيل",
  "no-seats": "لا توجد مقاعد متاحة",
  "registration-branch-unavailable": "فرع التسجيل غير متاح",
  "study-branch-unavailable": "فرع الدراسة غير متاح",
}
export function AdmissionEligibilitySummary({
  assessment,
}: {
  assessment: EligibilityAssessment
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-lg border p-4 ${assessment.eligible ? "border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20" : "border-amber-200 bg-amber-50/60 dark:bg-amber-950/20"}`}
    >
      <div className="flex items-center gap-2 font-medium">
        {assessment.eligible ? (
          <CircleCheck className="size-5 text-emerald-700" aria-hidden />
        ) : (
          <CircleAlert className="size-5 text-amber-700" aria-hidden />
        )}
        {assessment.eligible ? "الاختيار مؤهل" : "الاختيار يحتاج مراجعة"}
      </div>
      {assessment.reasons.length > 0 && (
        <ul className="mt-2 list-inside list-disc text-sm">
          {assessment.reasons.map((reason) => (
            <li key={reason}>{reasonLabels[reason] ?? reason}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
