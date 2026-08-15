"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Ban, FileCheck, Percent, Printer, Undo2 } from "lucide-react"
import { Button, buttonVariants } from "@workspace/ui/components/button"
import { isZero, subtract } from "@/shared/utils/money"
import { Card } from "@/shared/components/layout/card"
import { Section } from "@/shared/components/layout/section"
import { ConfirmDialog } from "@/shared/components/feedback/confirm-dialog"
import { EmptyState } from "@/shared/components/states/empty-state"
import { CancelInvoiceDialog } from "../components/cancel-invoice-dialog"
import type { InvoiceId } from "../types/common"
import {
  discountCopy,
  invoiceCopy,
  paymentCopy,
  refundCopy,
} from "../config/finance-copy"
import { financePermissions } from "../config/finance-permissions"
import { useCancelInvoice, useFinanceLookups, useInvoice, useIssueInvoice } from "../hooks/use-invoices"
import { useGenerateInstallmentPlan, useInstallmentPolicy } from "../hooks/use-installments"
import { useApplyDiscount } from "../hooks/use-reductions"
import { ApplyDiscountDialog } from "../components/apply-discount-dialog"
import { DiscountHistory } from "../components/discount-history"
import { AdjustmentList } from "../components/adjustment-list"
import { useRequestRefund } from "../hooks/use-refunds"
import { RefundForm, refundableAmount } from "../forms/refund-form"
import { FinancePage } from "../components/finance-page"
import {
  FinanceAreaState,
  FinanceBidiValue,
} from "../components/finance-area-states"
import { MoneyValue } from "../components/money-value"
import { InvoiceStatusBadge } from "../components/invoice-status-badge"
import { InstallmentSchedule } from "../components/installment-schedule"
import { InstallmentPlanForm } from "../components/installment-plan-form"

const installmentSectionTitle = "خطة التقسيط"
const dateFormatter = new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" })
const formatDate = (value?: string) =>
  value ? dateFormatter.format(new Date(value)) : "—"

export function InvoiceDetailScreen({ invoiceId }: { invoiceId: string }) {
  const id = invoiceId as InvoiceId
  const router = useRouter()
  const invoice = useInvoice(id)
  const lookups = useFinanceLookups()
  const issue = useIssueInvoice()
  const cancel = useCancelInvoice()
  const generatePlan = useGenerateInstallmentPlan(invoice.data?.studentId ?? "")
  const installmentPolicy = useInstallmentPolicy(invoiceId)
  const applyDiscount = useApplyDiscount(invoice.data?.studentId ?? "")
  const requestRefund = useRequestRefund(invoice.data?.studentId ?? "")
  const [confirmIssue, setConfirmIssue] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [discountOpen, setDiscountOpen] = useState(false)
  const [refundPayment, setRefundPayment] = useState<string | undefined>(undefined)

  const detail = invoice.data
  const canIssue =
    detail?.permissions.invoicesIssue && detail.status === "draft"
  const canCancel =
    detail?.permissions.invoicesCancel &&
    detail.status !== "cancelled" &&
    detail.status !== "paid" &&
    detail.payments.length === 0
  // A cancelled or fully paid invoice has no balance left to reduce.
  const canDiscount =
    detail?.permissions.discountsApprove &&
    detail.status !== "cancelled" &&
    detail.derived.status !== "paid" &&
    Boolean(lookups.data)

  return (
    <FinancePage
      title={detail ? `${invoiceCopy.number} ${detail.invoiceNumber}` : invoiceCopy.title}
      permission={financePermissions.invoicesView}
      actions={
        detail && (
          <div className="flex flex-wrap gap-2">
            {/*
              A link, not a button: the printable invoice is its own document
              at its own URL, so it opens in a tab the user can print, save as
              PDF, or keep open beside this screen.
            */}
            {detail.status !== "draft" && (
              <a
                href={`/student-finance/invoices/${detail.id}/print`}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: "outline" })}
              >
                <Printer aria-hidden />
                طباعة الفاتورة
              </a>
            )}
            {canIssue && (
              <Button onClick={() => setConfirmIssue(true)}>
                <FileCheck aria-hidden />
                {invoiceCopy.issue}
              </Button>
            )}
            {canDiscount && (
              <Button variant="outline" onClick={() => setDiscountOpen(true)}>
                <Percent aria-hidden />
                {discountCopy.apply}
              </Button>
            )}
            {canCancel && (
              <Button variant="outline" onClick={() => setConfirmCancel(true)}>
                <Ban aria-hidden />
                {invoiceCopy.cancelInvoice}
              </Button>
            )}
          </div>
        )
      }
    >
      <FinanceAreaState
        loading={invoice.isLoading}
        error={invoice.error}
        onRetry={() => void invoice.refetch()}
        loadingLabel="جارٍ تحميل الفاتورة"
      >
        {detail && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <InvoiceStatusBadge status={detail.derived.status} />
              {detail.issuedSnapshot && (
                <p className="text-muted-foreground text-sm">
                  {invoiceCopy.immutableNotice}
                </p>
              )}
            </div>

            <Section title="بيانات الفاتورة">
              <Card>
                <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label={invoiceCopy.student} value={detail.studentName} />
                  <Field
                    label={invoiceCopy.studentCode}
                    value={detail.studentCode}
                    bidi
                  />
                  <Field label={invoiceCopy.offering} value={detail.offeringLabel} />
                  {detail.batchLabel && (
                    <Field label={invoiceCopy.batch} value={detail.batchLabel} />
                  )}
                  <Field
                    label={invoiceCopy.issueDate}
                    value={formatDate(detail.issueDate)}
                    bidi
                  />
                  <Field
                    label={invoiceCopy.dueDate}
                    value={formatDate(detail.dueDate)}
                    bidi
                  />
                </dl>
              </Card>
            </Section>

            <Section title="القيم المالية">
              <Card>
                <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <MoneyField
                    label={invoiceCopy.totalAmount}
                    value={detail.derived.finalAmount}
                  />
                  <MoneyField
                    label={invoiceCopy.paidAmount}
                    value={detail.derived.netPaid}
                  />
                  <MoneyField
                    label={invoiceCopy.remaining}
                    value={detail.derived.remaining}
                  />
                </dl>
                {detail.issuedSnapshot && detail.adjustments.length > 0 && (
                  <dl className="mt-4 grid gap-4 border-t pt-4 sm:grid-cols-2 lg:grid-cols-4">
                    <MoneyField
                      label="القيمة عند الإصدار"
                      value={detail.issuedSnapshot.finalAmount}
                    />
                  </dl>
                )}
              </Card>
            </Section>

            <Section title={paymentCopy.title}>
              <div className="space-y-3">
                {detail.payments.length === 0 ? (
                  <EmptyState title={paymentCopy.emptyTitle} />
                ) : (
                  <ul className="space-y-3">
                    {detail.payments.map((payment) => (
                      <li key={payment.id}>
                        <Card className="flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium">
                              <MoneyValue value={payment.amount} />
                            </p>
                            <p className="text-muted-foreground text-sm">
                              <FinanceBidiValue>
                                {payment.receiptNumber}
                              </FinanceBidiValue>{" "}
                              ·{" "}
                              <FinanceBidiValue>
                                {formatDate(payment.paymentDate)}
                              </FinanceBidiValue>
                            </p>
                          </div>
                          {detail.permissions.refundsRecord &&
                            !isZero(
                              refundableAmount(
                                payment.amount,
                                detail.refunds.filter(
                                  (refund) => refund.paymentId === payment.id
                                )
                              )
                            ) && (
                              <Button
                                variant="outline"
                                onClick={() => setRefundPayment(payment.id)}
                              >
                                <Undo2 aria-hidden />
                                {refundCopy.request}
                              </Button>
                            )}
                        </Card>
                      </li>
                    ))}
                  </ul>
                )}
                {detail.refunds.length > 0 && (
                  <p className="text-muted-foreground text-sm">
                    {refundCopy.title}: {detail.refunds.length} —{" "}
                    {refundCopy.executionNotice}
                  </p>
                )}
              </div>
            </Section>

            <Section title={discountCopy.title}>
              <div className="space-y-4">
                <DiscountHistory discounts={detail.discounts} />
                <AdjustmentList adjustments={detail.adjustments} />
              </div>
            </Section>

            <Section title={installmentSectionTitle}>
              <div className="space-y-4">
                <InstallmentSchedule
                  installments={detail.installments}
                  currency={detail.currency}
                  precision={detail.precision}
                />
                {detail.permissions.installmentsManage &&
                  detail.status !== "cancelled" &&
                  lookups.data && installmentPolicy.data?.available && (
                    <InstallmentPlanForm
                      finalAmount={detail.derived.finalAmount}
                      offeringKind={detail.offeringKind}
                      eligibility={lookups.data.installmentEligibility}
                      minCount={installmentPolicy.data.minCount}
                      maxCountOverride={installmentPolicy.data.maxCount}
                      frequency={installmentPolicy.data.frequency}
                      hasPaidInstallments={detail.installments.some(
                        (installment) =>
                          !isZero(installment.paidAmount)
                      )}
                      pending={generatePlan.isPending}
                      onGenerate={({ count, firstDueDate }) =>
                        generatePlan.mutate({
                          invoiceId: id,
                          count,
                          scheduleBasis: installmentPolicy.data.frequency,
                          firstDueDate,
                          expectedVersion: detail.version,
                        })
                      }
                    />
                  )}
              </div>
            </Section>
          </div>
        )}
      </FinanceAreaState>

      <ConfirmDialog
        open={confirmIssue}
        title={invoiceCopy.issueTitle}
        description={invoiceCopy.issueDescription}
        confirmLabel={invoiceCopy.issue}
        pending={issue.isPending}
        onClose={() => setConfirmIssue(false)}
        onConfirm={() => {
          if (!detail) return
          issue.mutate(
            { invoiceId: id, expectedVersion: detail.version },
            { onSettled: () => setConfirmIssue(false) }
          )
        }}
      />

      {detail && lookups.data && (
        <ApplyDiscountDialog
          open={discountOpen}
          pending={applyDiscount.isPending}
          base={
            detail.issuedSnapshot
              ? detail.derived.finalAmount
              : subtract(detail.draft.totalAmount, detail.draft.scholarshipTotal)
          }
          currentFinal={detail.derived.finalAmount}
          collected={detail.derived.netPaid}
          policy={lookups.data.discountPolicy}
          isIssued={Boolean(detail.issuedSnapshot)}
          onClose={() => setDiscountOpen(false)}
          onConfirm={(values) =>
            applyDiscount.mutate(
              {
                invoiceId: id,
                kind: values.kind,
                value: values.value,
                reason: values.reason,
                expectedVersion: detail.version,
              },
              { onSuccess: () => setDiscountOpen(false) }
            )
          }
        />
      )}

      {detail &&
        (() => {
          const payment = detail.payments.find(
            (candidate) => candidate.id === refundPayment
          )
          if (!payment) return null
          return (
            <RefundForm
              open
              pending={requestRefund.isPending}
              receiptNumber={payment.receiptNumber}
              refundable={refundableAmount(
                payment.amount,
                detail.refunds.filter(
                  (refund) => refund.paymentId === payment.id
                )
              )}
              today={new Date().toISOString()}
              onClose={() => setRefundPayment(undefined)}
              onConfirm={(values) =>
                requestRefund.mutate(
                  {
                    paymentId: payment.id,
                    amount: values.amount,
                    reason: values.reason,
                    refundDate: values.refundDate,
                  },
                  { onSuccess: () => setRefundPayment(undefined) }
                )
              }
            />
          )
        })()}

      <CancelInvoiceDialog
        open={confirmCancel}
        pending={cancel.isPending}
        onClose={() => setConfirmCancel(false)}
        onConfirm={(reason) => {
          if (!detail) return
          cancel.mutate(
            { invoiceId: id, reason, expectedVersion: detail.version },
            {
              onSuccess: () => router.push("/student-finance/invoices"),
              onSettled: () => setConfirmCancel(false),
            }
          )
        }}
      />
    </FinancePage>
  )
}

function Field({
  label,
  value,
  bidi,
}: {
  label: string
  value: string
  bidi?: boolean
}) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-1 font-medium">
        {bidi ? <FinanceBidiValue>{value}</FinanceBidiValue> : value}
      </dd>
    </div>
  )
}

function MoneyField({
  label,
  value,
}: {
  label: string
  value: Parameters<typeof MoneyValue>[0]["value"]
}) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-1 text-lg font-semibold">
        <MoneyValue value={value} />
      </dd>
    </div>
  )
}
