"use client"

import { useMemo, useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@/shared/components/layout/card"
import { DataTable } from "@/shared/components/data-table/data-table"
import { EmptyState } from "@/shared/components/states/empty-state"
import type { PaymentListQuery } from "../types/commands"
import { defaultPaymentListQuery } from "../utils/finance-list-query"
import { financeCopy, paymentCopy } from "../config/finance-copy"
import { financePermissions } from "../config/finance-permissions"
import { usePayments } from "../hooks/use-payments"
import { useFinanceLookups } from "../hooks/use-invoices"
import { FinanceToolbar, toFilterOptions } from "../components/finance-toolbar"
import {
  toDateRange,
  type DateRangeValue,
} from "../components/date-range-filter"
import { paymentColumns } from "../components/payment-columns"
import { FinancePage } from "../components/finance-page"

export function PaymentsScreen() {
  const [query, setQuery] = useState<PaymentListQuery>(defaultPaymentListQuery)
  const [dates, setDates] = useState<DateRangeValue>({})
  const payments = usePayments(query)
  const lookups = useFinanceLookups()
  const columns = useMemo(() => paymentColumns, [])

  const patch = (next: Partial<PaymentListQuery>) =>
    setQuery((current) => ({ ...current, ...next }))
  const clear = () => {
    setDates({})
    setQuery(defaultPaymentListQuery)
  }
  const filtered =
    Boolean(query.search?.trim()) ||
    Boolean(query.methodIds?.length) ||
    Boolean(query.branchIds?.length) ||
    Boolean(query.dateRange)

  const rows = payments.data?.items ?? []
  const showEmpty = !payments.isLoading && !payments.error && rows.length === 0

  return (
    <FinancePage
      title={paymentCopy.title}
      description={financeCopy.description}
      permission={financePermissions.paymentsView}
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {paymentCopy.immutableNotice}
        </p>

        <Card>
          <FinanceToolbar
            groups={[
              {
                id: "method",
                label: paymentCopy.method,
                options:
                  lookups.data?.paymentMethods.map((method) => ({
                    value: method.id,
                    label: method.label,
                  })) ?? [],
                selected: query.methodIds ?? [],
                onChange: (methodIds) => patch({ methodIds, page: 1 }),
              },
              {
                id: "branch",
                label: "الفرع",
                options: toFilterOptions(lookups.data?.branches ?? []),
                selected: query.branchIds ?? [],
                onChange: (branchIds) => patch({ branchIds, page: 1 }),
              },
            ]}
            dateLabel={paymentCopy.paymentDate}
            dateValue={dates}
            onDateChange={(next) => {
              setDates(next)
              patch({ dateRange: toDateRange(next, "paymentDate"), page: 1 })
            }}
            onClear={clear}
          />
        </Card>
        <Card>
          {showEmpty ? (
            <EmptyState
              title={paymentCopy.emptyTitle}
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
            <DataTable
              data={rows}
              columns={columns}
              loading={payments.isLoading}
              error={payments.error?.message}
              onRetry={() => void payments.refetch()}
              getRowId={(row) => row.id}
              controlled={{
                search: query.search ?? "",
                page: payments.data?.page ?? query.page,
                pageSize: query.pageSize,
                total: payments.data?.total ?? 0,
                totalPages: payments.data?.totalPages ?? 1,
                onSearchChange: (search) => patch({ search, page: 1 }),
                onPageChange: (page) => patch({ page }),
              }}
            />
          )}
        </Card>
      </div>
    </FinancePage>
  )
}
