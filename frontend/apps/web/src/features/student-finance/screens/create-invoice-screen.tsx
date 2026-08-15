"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@/shared/components/layout/card"
import { Section } from "@/shared/components/layout/section"
import { invoiceCopy } from "../config/finance-copy"
import { financePermissions } from "../config/finance-permissions"
import { useFinanceLookups, useInvoices, useRaiseInvoices } from "../hooks/use-invoices"
import {
  useStudentEnrollments,
  useStudentSearch,
} from "../hooks/use-enrollment-picker"
import { FinancePage } from "../components/finance-page"
import { FinanceBidiValue } from "../components/finance-area-states"

/**
 * Raising an invoice is driven by an enrollment, not by free-form entry: the
 * commercial terms come from the admission decision, and the operation is
 * idempotent on `(enrollmentId, purpose)` so a repeat never duplicates an
 * obligation (spec FR-006).
 *
 * The enrollment is chosen by searching for the student rather than typed as an
 * identifier. Nothing in the product surfaces an enrollment id, so asking for
 * one made the screen unusable without a database query.
 */
export function CreateInvoiceScreen() {
  const router = useRouter()
  const raise = useRaiseInvoices()
  const lookups = useFinanceLookups()

  const [term, setTerm] = useState("")
  const [student, setStudent] = useState<{ id: string; label: string }>()
  const [enrollmentId, setEnrollmentId] = useState("")
  const [purposes, setPurposes] = useState<string[]>(["tuition"])
  const [error, setError] = useState<string>()
  const [outcome, setOutcome] = useState<string>()

  const results = useStudentSearch(term)
  const enrollments = useStudentEnrollments(student?.id)
  // What the student already owes, read before the raise so the result can say
  // whether anything was actually created.
  const existing = useInvoices({
    page: 1,
    pageSize: 100,
    ...(student ? { studentIds: [student.id] } : {}),
  })

  const purposeOptions = lookups.data?.chargePurposes ?? []

  const toggle = (value: string) =>
    setPurposes((current) =>
      current.includes(value)
        ? current.filter((entry) => entry !== value)
        : [...current, value]
    )

  const pickStudent = (option: { value: string; label: string }) => {
    setStudent({ id: option.value, label: option.label })
    setEnrollmentId("")
    setOutcome(undefined)
    setError(undefined)
  }

  const submit = () => {
    if (!enrollmentId) {
      setError("اختر التسجيل الأكاديمي أولًا")
      return
    }
    if (!purposes.length) {
      setError("اختر غرض رسوم واحدًا على الأقل")
      return
    }
    setError(undefined)
    const before = new Set((existing.data?.items ?? []).map((row) => row.id))

    raise.mutate(
      { enrollmentId, purposes },
      {
        onSuccess: (invoices) => {
          const created = invoices.filter((row) => !before.has(row.id))
          setOutcome(
            created.length === invoices.length
              ? `تم إنشاء ${invoices.length} فاتورة.`
              : created.length === 0
                ? "هذه الرسوم مفوترة بالفعل لهذا التسجيل. تم فتح الفاتورة القائمة دون إنشاء التزام جديد."
                : `تم إنشاء ${created.length} فاتورة، و${invoices.length - created.length} كانت قائمة بالفعل.`
          )
          const first = created[0] ?? invoices[0]
          if (first) router.push(`/student-finance/invoices/${first.id}`)
        },
      }
    )
  }

  return (
    <FinancePage
      title={invoiceCopy.create}
      permission={financePermissions.invoicesCreate}
    >
      <Section title="التسجيل الأكاديمي">
        <Card className="space-y-5">
          <p className="text-muted-foreground text-sm">
            تُنشأ الفاتورة من تسجيل أكاديمي قائم باستخدام الشروط المالية المعتمدة في
            القبول. تكرار الإنشاء لنفس التسجيل يعيد الفاتورة الحالية ولا ينشئ
            التزامًا مكررًا.
          </p>

          <div className="space-y-2">
            <label htmlFor="student-search" className="text-sm font-medium">
              الطالب
            </label>
            <input
              id="student-search"
              value={student ? student.label : term}
              placeholder="ابحث بالاسم أو كود الطالب"
              onChange={(event) => {
                setStudent(undefined)
                setEnrollmentId("")
                setTerm(event.target.value)
              }}
              className="border-input bg-background focus-visible:ring-ring h-10 w-full rounded-lg border px-3 text-start outline-none focus-visible:ring-2"
            />
            {!student && term.trim().length >= 2 && (
              <div role="listbox" aria-label="نتائج البحث" className="rounded-lg border">
                {results.isLoading && (
                  <p className="text-muted-foreground p-3 text-sm">جارٍ البحث…</p>
                )}
                {results.data?.length === 0 && (
                  <p className="text-muted-foreground p-3 text-sm">
                    لا يوجد طالب مطابق.
                  </p>
                )}
                {(results.data ?? []).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => pickStudent(option)}
                    className="hover:bg-muted block w-full px-3 py-2 text-start text-sm"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {student && (
            <div className="space-y-2">
              <label htmlFor="enrollment" className="text-sm font-medium">
                {invoiceCopy.enrollment}
              </label>
              {enrollments.isLoading ? (
                <p className="text-muted-foreground text-sm">جارٍ تحميل التسجيلات…</p>
              ) : enrollments.data?.length === 0 ? (
                <p role="status" className="text-muted-foreground text-sm">
                  لا يوجد تسجيل أكاديمي لهذا الطالب، ولا يمكن إصدار فاتورة بدونه.
                </p>
              ) : (
                <select
                  id="enrollment"
                  value={enrollmentId}
                  onChange={(event) => setEnrollmentId(event.target.value)}
                  aria-invalid={Boolean(error)}
                  className="border-input bg-background focus-visible:ring-ring h-10 w-full rounded-lg border px-3 text-start outline-none focus-visible:ring-2"
                >
                  <option value="">اختر التسجيل</option>
                  {(enrollments.data ?? []).map((enrollment) => (
                    <option key={enrollment.id} value={enrollment.id}>
                      {enrollment.offeringLabel}
                      {enrollment.batchLabel ? ` — ${enrollment.batchLabel}` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">أغراض الرسوم</legend>
            <p className="text-muted-foreground text-xs">
              تُصدر فاتورة مستقلة لكل غرض.
            </p>
            <div className="flex flex-wrap gap-3">
              {purposeOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    className="size-4"
                    checked={purposes.includes(option.value)}
                    onChange={() => toggle(option.value)}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>

          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          {outcome && (
            <p role="status" className="text-muted-foreground text-sm">
              {outcome}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Button onClick={submit} disabled={raise.isPending || !enrollmentId}>
              {raise.isPending ? "جارٍ الإنشاء..." : invoiceCopy.create}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/student-finance/invoices")}
            >
              إلغاء
            </Button>
          </div>

          {student && (
            <p className="text-muted-foreground text-xs">
              الطالب المحدد:{" "}
              <FinanceBidiValue>{student.label}</FinanceBidiValue>
            </p>
          )}
        </Card>
      </Section>
    </FinancePage>
  )
}
