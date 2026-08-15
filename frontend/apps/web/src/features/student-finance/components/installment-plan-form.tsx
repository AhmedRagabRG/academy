"use client"

import { useId, useMemo, useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@/shared/components/layout/card"
import { allocate, type Money } from "@/shared/utils/money"
import type { OfferingKind } from "../types/common"
import type { ScheduleBasis } from "../types/common"
import type { InstallmentEligibility } from "../types/domain"
import { installmentCopy } from "../config/finance-copy"
import {
  allowsInstallments,
  buildSchedule,
  maxInstallmentCount,
} from "../utils/finance-installments"
import { MoneyValue } from "./money-value"

const dateFormatter = new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" })

/**
 * Generates an installment plan with a live preview.
 *
 * The preview uses the same `buildSchedule` the service uses, so the amounts a
 * user sees before saving are exactly the amounts that get saved — including the
 * rounding remainder on the final installment.
 */
export function InstallmentPlanForm({
  finalAmount,
  offeringKind,
  eligibility,
  minCount,
  maxCountOverride,
  frequency,
  hasPaidInstallments,
  pending,
  onGenerate,
}: {
  finalAmount: Money
  offeringKind: OfferingKind
  eligibility: readonly InstallmentEligibility[]
  minCount?: number
  maxCountOverride?: number
  frequency?: Exclude<ScheduleBasis, "custom">
  hasPaidInstallments: boolean
  pending: boolean
  onGenerate: (input: { count: number; firstDueDate: string }) => void
}) {
  const baseId = useId()
  const permitted = maxCountOverride !== undefined || allowsInstallments(offeringKind, eligibility)
  const resolvedMinCount = minCount ?? 1
  const maxCount = maxCountOverride ?? maxInstallmentCount(offeringKind, eligibility)
  const resolvedFrequency = frequency ?? "monthly"

  const [count, setCount] = useState(Math.max(resolvedMinCount, Math.min(3, maxCount)))
  const [firstDueDate, setFirstDueDate] = useState("2026-09-01")

  const preview = useMemo(() => {
    if (!permitted || count < resolvedMinCount || count > maxCount) return []
    try {
      return buildSchedule({
        finalAmount,
        count,
        scheduleBasis: resolvedFrequency,
        firstDueDate: new Date(firstDueDate).toISOString(),
      })
    } catch {
      return []
    }
  }, [permitted, count, resolvedMinCount, maxCount, finalAmount, firstDueDate, resolvedFrequency])

  if (!permitted)
    return (
      <Card>
        <p role="note" className="text-muted-foreground text-sm">
          هذا النوع من المنتجات لا يسمح بخطط التقسيط وفق الإعدادات الحالية.
        </p>
      </Card>
    )

  if (hasPaidInstallments)
    return (
      <Card>
        <p role="note" className="text-muted-foreground text-sm">
          لا يمكن إعادة إنشاء الخطة بعد تسجيل مدفوعات على أحد الأقساط.
        </p>
      </Card>
    )

  const countInvalid = count < resolvedMinCount || count > maxCount

  return (
    <Card className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor={`${baseId}-count`} className="text-sm font-medium">
            {installmentCopy.count} ({resolvedMinCount === 1
              ? `بحد أقصى ${maxCount}`
              : `من ${resolvedMinCount} إلى ${maxCount}`})
          </label>
          <input
            id={`${baseId}-count`}
            type="number"
            min={resolvedMinCount}
            max={maxCount}
            dir="ltr"
            value={count}
            onChange={(event) => setCount(Number(event.target.value))}
            aria-invalid={countInvalid}
            aria-describedby={countInvalid ? `${baseId}-count-error` : undefined}
            className="border-input bg-background focus-visible:ring-ring h-10 w-full rounded-lg border px-3 text-start outline-none focus-visible:ring-2"
          />
          {countInvalid && (
            <p
              id={`${baseId}-count-error`}
              role="alert"
              className="text-destructive text-sm"
            >
              عدد الأقساط يجب أن يكون بين {resolvedMinCount === 1 ? "١" : resolvedMinCount} و {maxCount}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor={`${baseId}-due`} className="text-sm font-medium">
            {installmentCopy.firstDueDate}
          </label>
          <input
            id={`${baseId}-due`}
            type="date"
            dir="ltr"
            value={firstDueDate}
            onChange={(event) => setFirstDueDate(event.target.value)}
            className="border-input bg-background focus-visible:ring-ring h-10 w-full rounded-lg border px-3 outline-none focus-visible:ring-2"
          />
        </div>
      </div>

      {preview.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">{installmentCopy.preview}</p>
          <ul className="text-muted-foreground space-y-1 text-sm">
            {preview.map((entry) => (
              <li key={entry.sequence} className="flex justify-between gap-4">
                <span>
                  قسط {entry.sequence} — {dateFormatter.format(new Date(entry.dueDate))}
                </span>
                <MoneyValue value={entry.amount} />
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground text-xs">{installmentCopy.sumNotice}</p>
        </div>
      )}

      <Button
        disabled={pending || countInvalid}
        onClick={() =>
          onGenerate({
            count,
            firstDueDate: new Date(firstDueDate).toISOString(),
          })
        }
      >
        {pending ? "جارٍ الإنشاء..." : installmentCopy.generate}
      </Button>
    </Card>
  )
}

/** Re-exported so the preview and the service provably share one allocator. */
export { allocate }
