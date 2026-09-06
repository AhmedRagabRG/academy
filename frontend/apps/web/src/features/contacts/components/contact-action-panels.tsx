"use client"

import { useRef, useState } from "react"
import { ArrowRight, FileSpreadsheet, Upload } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import type { ContactDraft } from "../types/domain"

const initialDraft: ContactDraft = {
  name: "",
  phone: "",
  email: "",
  company: "",
  role: "",
}

export function CreateContactPanel({
  onBack,
  onCreate,
}: {
  onBack: () => void
  onCreate: (draft: ContactDraft) => void
}) {
  const [draft, setDraft] = useState(initialDraft)
  const update = (key: keyof ContactDraft, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }))

  return (
    <aside
      className="min-h-0 overflow-y-auto bg-card"
      aria-label="إضافة جهة اتصال"
    >
      <header className="border-b px-5 py-4">
        <Button variant="ghost" className="mb-3 xl:hidden" onClick={onBack}>
          <ArrowRight aria-hidden />
          القائمة
        </Button>
        <p className="text-xs font-medium text-brand-blue">جهة اتصال جديدة</p>
        <h2 className="mt-1 text-lg font-medium text-brand-navy dark:text-foreground">
          إضافة بيانات التواصل
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          يمكنك استكمال المجموعات والحقول المخصصة بعد الحفظ.
        </p>
      </header>
      <form
        className="space-y-4 p-5"
        onSubmit={(event) => {
          event.preventDefault()
          if (!draft.name.trim() || !draft.phone.trim()) return
          onCreate(draft)
        }}
      >
        {(
          [
            ["name", "الاسم الكامل", "مثال: هبة محمود", false],
            ["phone", "رقم الهاتف", "+20 10 0000 0000", true],
            ["email", "البريد الإلكتروني", "name@example.com", true],
            ["company", "الشركة", "اسم الشركة أو الجهة", false],
            ["role", "الصفة الوظيفية", "مثال: مسؤولة تدريب", false],
            ["secondaryPhone", "هاتف آخر", "+20 12 0000 0000", true],
          ] as const
        ).map(([key, label, placeholder, ltr]) => (
          <label key={key} className="grid gap-1.5 text-sm">
            <span className="font-medium">
              {label}
              {(key === "name" || key === "phone") && (
                <span className="text-destructive"> *</span>
              )}
            </span>
            <Input
              required={key === "name" || key === "phone"}
              dir={ltr ? "ltr" : undefined}
              value={draft[key] ?? ""}
              placeholder={placeholder}
              onChange={(event) => update(key, event.target.value)}
            />
          </label>
        ))}
        <div className="flex gap-2 border-t pt-4">
          <Button type="submit">حفظ جهة الاتصال</Button>
          <Button type="button" variant="ghost" onClick={onBack}>
            إلغاء
          </Button>
        </div>
      </form>
    </aside>
  )
}

export function ImportContactsPanel({
  onBack,
  onFile,
}: {
  onBack: () => void
  onFile: (file: File) => Promise<number>
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const choose = async (file?: File) => {
    if (!file) return
    setPending(true)
    setResult(null)
    try {
      const count = await onFile(file)
      setResult(
        count
          ? `تم استيراد ${count} جهة اتصال بنجاح.`
          : "لم نجد صفوفًا صالحة. تأكد من وجود الاسم ورقم الهاتف."
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <aside
      className="min-h-0 overflow-y-auto bg-card"
      aria-label="استيراد جهات الاتصال"
    >
      <header className="border-b px-5 py-4">
        <Button variant="ghost" className="mb-3 xl:hidden" onClick={onBack}>
          <ArrowRight aria-hidden />
          القائمة
        </Button>
        <p className="text-xs font-medium text-brand-blue">استيراد CSV</p>
        <h2 className="mt-1 text-lg font-medium text-brand-navy dark:text-foreground">
          أضف عدة جهات دفعة واحدة
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          يقبل الملف عناوين عربية أو إنجليزية للحقول الأساسية.
        </p>
      </header>
      <div className="p-5">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(event) => void choose(event.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault()
            void choose(event.dataTransfer.files[0])
          }}
          className="grid min-h-56 w-full place-items-center rounded-xl border border-dashed border-brand-blue/35 bg-brand-blue/[0.035] p-6 text-center transition-colors hover:bg-brand-blue/[0.065] focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span>
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-brand-blue/10 text-brand-blue">
              <Upload aria-hidden />
            </span>
            <strong className="mt-4 block text-sm">
              {pending ? "جارٍ قراءة الملف…" : "اختر ملف CSV أو اسحبه هنا"}
            </strong>
            <span className="mt-2 block text-xs text-muted-foreground">
              الحد الأدنى: عمود الاسم وعمود الهاتف
            </span>
          </span>
        </button>
        {result && (
          <p
            role="status"
            className="mt-4 rounded-lg bg-muted px-3 py-2 text-sm"
          >
            {result}
          </p>
        )}
        <section className="mt-6" aria-labelledby="csv-columns-title">
          <div className="flex items-center gap-2">
            <FileSpreadsheet
              className="size-4 text-muted-foreground"
              aria-hidden
            />
            <h3 id="csv-columns-title" className="text-sm font-medium">
              الأعمدة المدعومة
            </h3>
          </div>
          <div className="mt-3 overflow-hidden rounded-lg border text-xs">
            {[
              "الاسم / name",
              "الهاتف / phone",
              "البريد / email",
              "الشركة / company",
              "الصفة / role",
              "هاتف آخر / secondaryPhone",
            ].map((item, index) => (
              <div
                key={item}
                className="flex items-center justify-between border-b px-3 py-2.5 last:border-b-0"
              >
                <span>{item}</span>
                <span className="text-muted-foreground">
                  {index < 2 ? "مطلوب" : "اختياري"}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </aside>
  )
}
