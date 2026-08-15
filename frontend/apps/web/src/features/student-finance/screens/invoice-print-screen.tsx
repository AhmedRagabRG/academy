"use client"

import { useEffect } from "react"
import Image from "next/image"
import { useQuery } from "@tanstack/react-query"
import { Printer } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { isPositive, subtract, sum, zeroMoney } from "@/shared/utils/money"
import fallbackLogo from "@/shared/assets/brand-logo.png"
import type { InvoiceId } from "../types/common"
import { useInvoice } from "../hooks/use-invoices"
import { financeDependencyReaders } from "../services/finance-dependency-adapters"
import { financeKeys } from "../services/finance-query-keys"
import { FinanceAreaState } from "../components/finance-area-states"
import { MoneyValue } from "../components/money-value"
import type { InvoiceDetail } from "../types/projections"

const dateFormatter = new Intl.DateTimeFormat("ar-EG", { dateStyle: "long" })
const formatDate = (value?: string) =>
  value ? dateFormatter.format(new Date(value)) : "—"

const statusLabels: Record<string, string> = {
  draft: "مسودة",
  issued: "صادرة",
  "partially-paid": "مدفوعة جزئيًا",
  paid: "مدفوعة بالكامل",
  cancelled: "ملغاة",
}

const purposeLabels: Record<string, string> = {
  "registration-fee": "رسوم تسجيل",
  tuition: "مصروفات دراسية",
  "certificate-fee": "رسوم شهادة",
  other: "أخرى",
}

function useLetterhead() {
  return useQuery({
    queryKey: financeKeys.letterhead(),
    queryFn: ({ signal }) =>
      financeDependencyReaders.identity.getLetterhead(signal),
    staleTime: 5 * 60_000,
  })
}

/**
 * The invoice as a document rather than as a screen.
 *
 * Printed by the browser, not rendered to a PDF server-side: the figures are
 * already on the client, and a print stylesheet keeps one source of truth for
 * the layout instead of a second template that drifts from this one.
 */
export function InvoicePrintScreen({ invoiceId }: { invoiceId: string }) {
  const invoice = useInvoice(invoiceId as InvoiceId)
  const letterhead = useLetterhead()
  const detail = invoice.data

  // Titles the browser's own print header, so a saved PDF is named after the
  // invoice rather than after the application.
  useEffect(() => {
    if (!detail) return
    const previous = document.title
    document.title = detail.invoiceNumber
    return () => {
      document.title = previous
    }
  }, [detail])

  return (
    <FinanceAreaState
      loading={invoice.isLoading}
      error={invoice.error}
      onRetry={() => void invoice.refetch()}
      loadingLabel="جارٍ تحضير الفاتورة للطباعة"
    >
      {detail && (
        <div className="bg-muted/40 min-h-screen p-4 print:bg-white print:p-0">
          <div className="mx-auto flex max-w-[210mm] justify-end pb-4 print:hidden">
            <Button onClick={() => window.print()}>
              <Printer aria-hidden />
              طباعة الفاتورة
            </Button>
          </div>

          <article className="mx-auto w-full max-w-[210mm] bg-white p-10 text-black shadow-sm print:max-w-none print:p-0 print:shadow-none">
            <Letterhead
              logoUrl={letterhead.data?.logoUrl}
              name={letterhead.data?.name}
              address={letterhead.data?.address}
              email={letterhead.data?.email}
              phone={letterhead.data?.phone}
              detail={detail}
            />
            <Parties detail={detail} />
            <Amounts detail={detail} />
            {detail.payments.length > 0 && <Payments detail={detail} />}
          </article>
        </div>
      )}
    </FinanceAreaState>
  )
}

function Letterhead({
  logoUrl,
  name,
  address,
  email,
  phone,
  detail,
}: {
  logoUrl?: string
  name?: string
  address?: string
  email?: string
  phone?: string
  detail: InvoiceDetail
}) {
  return (
    <header className="flex items-start justify-between gap-6 border-b-2 border-neutral-800 pb-6">
      <div className="flex items-start gap-4">
        {/*
          The uploaded mark when Settings has one, and the bundled brand logo
          until then — a printed invoice with an empty header block looks like
          a rendering fault rather than a missing setting.
        */}
        {logoUrl ? (
          // The asset is uploaded at runtime, so its dimensions are unknown at
          // build time and `next/image` has nothing to optimise against.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            className="h-16 w-auto object-contain"
          />
        ) : (
          <Image
            src={fallbackLogo}
            alt=""
            className="h-16 w-auto object-contain"
            sizes="200px"
          />
        )}
        <div className="space-y-1 text-xs leading-relaxed text-neutral-700">
          <p className="text-base font-bold text-black">{name ?? "—"}</p>
          {address && <p>{address}</p>}
          <p className="flex flex-wrap gap-x-3">
            {phone && <span dir="ltr">{phone}</span>}
            {email && <span dir="ltr">{email}</span>}
          </p>
        </div>
      </div>

      <div className="shrink-0 text-end">
        <h1 className="text-2xl font-bold tracking-tight">فاتورة</h1>
        <p className="mt-1 font-mono text-sm" dir="ltr">
          {detail.invoiceNumber}
        </p>
        <p className="mt-2 inline-block rounded border border-neutral-400 px-2 py-0.5 text-xs">
          {statusLabels[detail.status] ?? detail.status}
        </p>
      </div>
    </header>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] text-neutral-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{value}</dd>
    </div>
  )
}

function Parties({ detail }: { detail: InvoiceDetail }) {
  return (
    <section className="grid grid-cols-2 gap-x-8 gap-y-4 py-6">
      <dl className="space-y-3">
        <Field label="الطالب" value={detail.studentName} />
        <Field
          label="كود الطالب"
          value={<span dir="ltr">{detail.studentCode}</span>}
        />
      </dl>
      <dl className="space-y-3">
        <Field label="تاريخ الإصدار" value={formatDate(detail.issueDate)} />
        <Field label="تاريخ الاستحقاق" value={formatDate(detail.dueDate)} />
      </dl>
      <dl className="col-span-2 grid grid-cols-3 gap-4 border-t pt-4">
        <Field label="البرنامج" value={detail.offeringLabel ?? "—"} />
        <Field label="الدفعة" value={detail.batchLabel ?? "—"} />
        <Field
          label="الغرض"
          value={purposeLabels[detail.purpose] ?? detail.purpose}
        />
      </dl>
    </section>
  )
}

function Row({
  label,
  value,
  strong,
}: {
  label: string
  value: React.ReactNode
  strong?: boolean
}) {
  return (
    <tr className={strong ? "border-t-2 border-neutral-800" : "border-t"}>
      <th
        scope="row"
        className={`p-2 text-start font-normal ${strong ? "font-bold" : ""}`}
      >
        {label}
      </th>
      <td className={`p-2 text-end ${strong ? "text-base font-bold" : ""}`}>
        {value}
      </td>
    </tr>
  )
}

function Amounts({ detail }: { detail: InvoiceDetail }) {
  // The issued figures are what the student was actually billed; the draft is
  // only meaningful before issuing.
  const snapshot = detail.issuedSnapshot ?? detail.draft
  return (
    <section>
      <h2 className="mb-2 text-sm font-bold">تفاصيل المبلغ</h2>
      <table className="w-full text-sm">
        <tbody>
          <Row label="الإجمالي" value={<MoneyValue value={snapshot.totalAmount} />} />
          <Row label="الخصم" value={<MoneyValue value={snapshot.discountTotal} />} />
          <Row
            label="المنح"
            value={<MoneyValue value={snapshot.scholarshipTotal} />}
          />
          <Row
            label="الصافي المستحق"
            value={<MoneyValue value={snapshot.finalAmount} />}
            strong
          />
          <Row label="المدفوع" value={<MoneyValue value={detail.derived.netPaid} />} />
          <Row
            label="المتبقي"
            value={<MoneyValue value={detail.derived.remaining} />}
            strong
          />
        </tbody>
      </table>
    </section>
  )
}

function Payments({ detail }: { detail: InvoiceDetail }) {
  /**
   * What was refunded, as the gap between what was received and what counts.
   *
   * `netPaid` is already net of refunds while the rows below are gross, so a
   * printed invoice listing a 50 payment beside 30 paid reads as an error.
   * Naming the difference makes the column add up on paper.
   */
  const received = detail.payments.length
    ? sum(
        detail.payments.map((payment) => payment.amount),
        detail.currency,
        detail.precision
      )
    : zeroMoney(detail.currency, detail.precision)
  const refunded = subtract(received, detail.derived.netPaid)

  return (
    <section className="mt-6 break-inside-avoid">
      <h2 className="mb-2 text-sm font-bold">المدفوعات</h2>
      <table className="w-full text-sm">
        <thead className="border-b border-neutral-400 text-[11px] text-neutral-600">
          <tr>
            <th scope="col" className="p-2 text-start font-medium">
              التاريخ
            </th>
            <th scope="col" className="p-2 text-start font-medium">
              المرجع
            </th>
            <th scope="col" className="p-2 text-end font-medium">
              المبلغ
            </th>
          </tr>
        </thead>
        <tbody>
          {detail.payments.map((payment) => (
            <tr key={payment.id} className="border-b">
              <td className="p-2">{formatDate(payment.paymentDate)}</td>
              <td className="p-2" dir="ltr">
                {payment.receiptNumber}
              </td>
              <td className="p-2 text-end">
                <MoneyValue value={payment.amount} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-neutral-800">
            <th scope="row" colSpan={2} className="p-2 text-start font-bold">
              إجمالي المُحصَّل
            </th>
            <td className="p-2 text-end font-bold">
              <MoneyValue value={received} />
            </td>
          </tr>
          {isPositive(refunded) && (
            <tr className="border-t">
              <th scope="row" colSpan={2} className="p-2 text-start font-normal">
                مبالغ مُستردة
              </th>
              <td className="p-2 text-end">
                −<MoneyValue value={refunded} />
              </td>
            </tr>
          )}
        </tfoot>
      </table>
    </section>
  )
}
