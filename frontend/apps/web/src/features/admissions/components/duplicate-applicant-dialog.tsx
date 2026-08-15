"use client"

import { Button } from "@workspace/ui/components/button"

export interface DuplicateCandidateView {
  applicantId: string
  label: string
  reasons: string[]
}

export function DuplicateApplicantDialog({
  candidates,
  onUseExisting,
  onCreateException,
  onCancel,
}: {
  candidates: DuplicateCandidateView[]
  onUseExisting: (id: string) => void
  onCreateException: (reason: string) => void
  onCancel: () => void
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="duplicate-title"
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
    >
      <div className="w-full max-w-lg space-y-4 rounded-lg border bg-card p-6 shadow-xl">
        <h2 id="duplicate-title" className="font-heading text-lg font-bold">
          متقدم محتمل مطابق
        </h2>
        <p className="text-sm text-muted-foreground">
          راجع النتائج قبل إنشاء سجل جديد. لن يتم دمج أي بيانات تلقائيًا.
        </p>
        <ul className="space-y-2">
          {candidates.map((candidate) => (
            <li
              key={candidate.applicantId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
            >
              <span>{candidate.label}</span>
              <Button
                size="sm"
                onClick={() => onUseExisting(candidate.applicantId)}
              >
                استخدام السجل
              </Button>
            </li>
          ))}
        </ul>
        <label className="block space-y-2 text-sm">
          سبب إنشاء استثناء
          <textarea
            id="duplicate-reason"
            className="min-h-20 w-full rounded-lg border bg-background p-3"
          />
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            إلغاء
          </Button>
          <Button
            variant="secondary"
            onClick={() =>
              onCreateException(
                (
                  document.getElementById(
                    "duplicate-reason"
                  ) as HTMLTextAreaElement | null
                )?.value ?? ""
              )
            }
          >
            إنشاء استثناء
          </Button>
        </div>
      </div>
    </div>
  )
}
