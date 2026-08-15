"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@/shared/components/layout/card"
import { EmptyState } from "@/shared/components/states/empty-state"

import type { RefundListQuery } from "../types/commands"
import type { RefundSummary } from "../types/projections"
import { defaultRefundListQuery } from "../utils/finance-list-query"
import { financeCopy, refundCopy } from "../config/finance-copy"
import { financePermissions } from "../config/finance-permissions"
import { useDecideRefund, useRefunds } from "../hooks/use-refunds"
import { useFinanceLookups } from "../hooks/use-invoices"
import { FinanceToolbar, toFilterOptions } from "../components/finance-toolbar"
import {
  toDateRange,
  type DateRangeValue,
} from "../components/date-range-filter"
import { FinancePage } from "../components/finance-page"
import {
  FinanceAreaState,
  FinanceBidiValue,
} from "../components/finance-area-states"
import { MoneyValue } from "../components/money-value"
import {
  RefundStatusActions,
  type RefundDecision,
} from "../components/refund-status-actions"

const dateFormatter = new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" })
const formatDate = (value: string) => {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? "—" : dateFormatter.format(parsed)
}

/**
 * The refunds queue.
 *
 * Rendered as a list of cards rather than a data table because each row carries
 * its own decision controls, which do not belong in a cell — and because the queue
 * is read one request at a time rather than scanned in columns.
 */
export function RefundsScreen() {
  const [query, setQuery] = useState<RefundListQuery>(defaultRefundListQuery)
  const [dates, setDates] = useState<DateRangeValue>({})
  const refunds = useRefunds(query)
  const lookups = useFinanceLookups()

  const patch = (next: Partial<RefundListQuery>) =>
    setQuery((current) => ({ ...current, ...next }))
  const clear = () => {
    setDates({})
    setQuery(defaultRefundListQuery)
  }
  const filtered =
    Boolean(query.search?.trim()) ||
    Boolean(query.statuses?.length) ||
    Boolean(query.branchIds?.length) ||
    Boolean(query.dateRange)
  // A refunds queue spans students, so invalidation is driven by the row acted on.
  const [actingOn, setActingOn] = useState<string | undefined>(undefined)

  const rows = refunds.data?.items ?? []
  const showEmpty = !refunds.isLoading && !refunds.error && rows.length === 0

  return (
    <FinancePage
      title={refundCopy.title}
      description={financeCopy.description}
      permission={financePermissions.refundsView}
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {refundCopy.executionNotice}
        </p>

        <Card>
          <FinanceToolbar
            search={query.search ?? ""}
            onSearchChange={(search) => patch({ search, page: 1 })}
            searchPlaceholder="ابحث برقم الفاتورة أو كود الطالب"
            groups={[
              {
                id: "status",
                label: "الحالة",
                options:
                  lookups.data?.refundStatuses.map((status) => ({
                    value: status.value,
                    label: status.label,
                  })) ?? [],
                selected: query.statuses ?? [],
                onChange: (statuses) =>
                  patch({
                    statuses: statuses as RefundListQuery["statuses"],
                    page: 1,
                  }),
              },
              {
                id: "branch",
                label: "الفرع",
                options: toFilterOptions(lookups.data?.branches ?? []),
                selected: query.branchIds ?? [],
                onChange: (branchIds) => patch({ branchIds, page: 1 }),
              },
            ]}
            dateLabel={refundCopy.refundDate}
            dateValue={dates}
            onDateChange={(next) => {
              setDates(next)
              patch({ dateRange: toDateRange(next, "refundDate"), page: 1 })
            }}
            onClear={clear}
          />
        </Card>

        <FinanceAreaState
          loading={refunds.isLoading}
          error={refunds.error}
          onRetry={() => void refunds.refetch()}
          loadingLabel="جارٍ تحميل المستردات"
        >
          {showEmpty ? (
            <EmptyState
              title={refundCopy.emptyTitle}
              description={
                filtered
                  ? "جرّب تعديل البحث أو إزالة بعض عوامل التصفية."
                  : undefined
              }
              action={
                filtered ? (
                  <Button variant="outline" onClick={clear}>
                    مسح كل عوامل التصفية
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <ul className="space-y-3">
              {rows.map((refund) => (
                <li key={refund.id}>
                  <RefundRow
                    refund={refund}
                    acting={actingOn === refund.id}
                    onActing={setActingOn}
                  />
                </li>
              ))}
            </ul>
          )}
        </FinanceAreaState>
      </div>
    </FinancePage>
  )
}

function RefundRow({
  refund,
  acting,
  onActing,
}: {
  refund: RefundSummary
  acting: boolean
  onActing: (id: string | undefined) => void
}) {
  const { decide, complete } = useDecideRefund(refund.studentId)
  const pending = acting && (decide.isPending || complete.isPending)

  const run = ({ to, reason }: RefundDecision) => {
    onActing(refund.id)
    const settled = { onSettled: () => onActing(undefined) }
    if (to === "completed")
      complete.mutate(
        { refundId: refund.id, expectedVersion: refund.version },
        settled
      )
    else
      decide.mutate(
        {
          refundId: refund.id,
          decision: to,
          reason,
          expectedVersion: refund.version,
        },
        settled
      )
  }

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">
            <MoneyValue value={refund.amount} emphasis />
          </p>
          <p className="text-sm text-muted-foreground">
            {refund.studentName} ·{" "}
            <FinanceBidiValue>{refund.studentCode}</FinanceBidiValue>
          </p>
          <p className="text-sm text-muted-foreground">
            <Link
              href={`/student-finance/invoices/${refund.invoiceId}`}
              className="rounded underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              <FinanceBidiValue>{refund.invoiceNumber}</FinanceBidiValue>
            </Link>{" "}
            · {refundCopy.relatedPayment}:{" "}
            <FinanceBidiValue>{refund.receiptNumber}</FinanceBidiValue>
          </p>
        </div>
        <p className="text-xs text-muted-foreground">
          {refundCopy.refundDate}:{" "}
          <FinanceBidiValue>{formatDate(refund.refundDate)}</FinanceBidiValue>
          <br />
          طلبه {refund.requestedByName}
          {refund.approvedByName && <> · اعتمده {refund.approvedByName}</>}
        </p>
      </div>

      <RefundStatusActions refund={refund} pending={pending} onDecide={run} />
    </Card>
  )
}
