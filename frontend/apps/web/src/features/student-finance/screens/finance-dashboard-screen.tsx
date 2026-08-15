"use client"

import Link from "next/link"
import { FileText, Receipt, TriangleAlert, Wallet } from "lucide-react"
import { Card } from "@/shared/components/layout/card"
import { Section } from "@/shared/components/layout/section"
import { financeCopy, invoiceCopy } from "../config/finance-copy"
import { financePermissions } from "../config/finance-permissions"
import { useFinanceDashboardSummary } from "../hooks/use-invoices"
import { FinancePage } from "../components/finance-page"
import { FinanceAreaState } from "../components/finance-area-states"
import { MoneyValue } from "../components/money-value"

/**
 * Collection overview across every invoice in scope.
 *
 * The figures come from a dedicated summary read, not from a page of the invoice
 * queue. Summing the queue meant summing at most `MAX_PAGE_SIZE` rows and
 * presenting the result as an organization-wide total — silently wrong past 100
 * invoices, with nothing on screen to indicate the truncation.
 */
export function FinanceDashboardScreen() {
  const summary = useFinanceDashboardSummary()

  return (
    <FinancePage
      title={financeCopy.dashboardTitle}
      description={financeCopy.description}
      permission={financePermissions.view}
    >
      <FinanceAreaState
        loading={summary.isLoading}
        error={summary.error}
        onRetry={() => void summary.refetch()}
        loadingLabel="جارٍ تحميل الملخص المالي"
      >
        <div className="space-y-8">
          {/* Zeroes are shown only when they are figures, never when they mean
              "nothing has been recorded yet". */}
          {summary.data?.hasNoRecords ? (
            <Card className="space-y-2">
              <p className="font-medium">لا توجد فواتير بعد</p>
              <p className="text-muted-foreground text-sm">
                ستظهر إجماليات التحصيل هنا بعد إصدار أول فاتورة.
              </p>
            </Card>
          ) : (
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                label="إجمالي المفوتر"
                value={summary.data?.invoiced}
                icon={FileText}
              />
              <Stat
                label="إجمالي المحصّل"
                value={summary.data?.collected}
                icon={Receipt}
              />
              <Stat
                label="إجمالي المتبقي"
                value={summary.data?.outstanding}
                icon={Wallet}
              />
              <Card>
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <dt className="text-muted-foreground text-sm">
                      فواتير غير مسددة بالكامل
                    </dt>
                    <dd className="mt-2 text-2xl font-semibold">
                      {summary.data?.unsettledInvoices ?? 0}
                    </dd>
                  </div>
                  <TriangleAlert
                    className="text-muted-foreground size-6"
                    aria-hidden
                  />
                </div>
              </Card>
            </dl>
          )}

          <Section title="الوصول السريع">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <QuickLink href="/student-finance/invoices" label={invoiceCopy.title} />
              <QuickLink href="/student-finance/payments" label="المدفوعات" />
              <QuickLink href="/student-finance/installments" label="الأقساط" />
              <QuickLink href="/student-finance/refunds" label="المستردات" />
            </div>
          </Section>
        </div>
      </FinanceAreaState>
    </FinancePage>
  )
}

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string
  /** Absent while the summary loads — an em dash, never a fabricated zero. */
  value?: Parameters<typeof MoneyValue>[0]["value"]
  icon: typeof FileText
}) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <dt className="text-muted-foreground text-sm">{label}</dt>
          <dd className="mt-2 text-2xl font-semibold">
            {value ? <MoneyValue value={value} /> : "—"}
          </dd>
        </div>
        <Icon className="text-muted-foreground size-6" aria-hidden />
      </div>
    </Card>
  )
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="border-border bg-card hover:bg-muted/40 focus-visible:ring-ring rounded-lg border p-4 text-sm font-medium outline-none focus-visible:ring-2"
    >
      {label}
    </Link>
  )
}
