"use client"

import { useMemo, useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@/shared/components/layout/card"
import { DataTable } from "@/shared/components/data-table/data-table"
import { EmptyState } from "@/shared/components/states/empty-state"
import { Dropdown } from "@/shared/components/forms/dropdown"
import { FilterBar } from "@/shared/components/data-table/filter-bar"
import type { InstallmentListQuery } from "../types/commands"
import type { InstallmentStatus } from "../types/common"
import { defaultInstallmentListQuery } from "../utils/finance-list-query"
import {
  financeCopy,
  installmentCopy,
  installmentStatusCopy,
  invoiceCopy,
} from "../config/finance-copy"
import { financePermissions } from "../config/finance-permissions"
import { useInstallments } from "../hooks/use-installments"
import { installmentColumns } from "../components/installment-columns"
import { FinancePage } from "../components/finance-page"
import {
  DateRangeFilter,
  toDateRange,
  type DateRangeValue,
} from "../components/date-range-filter"

const statusOptions = (
  ["pending", "partially-paid", "paid", "overdue"] as const
).map((value) => ({ value, label: installmentStatusCopy[value] }))

export function InstallmentsScreen() {
  const [query, setQuery] = useState<InstallmentListQuery>(
    defaultInstallmentListQuery
  )
  const [dates, setDates] = useState<DateRangeValue>({})
  const installments = useInstallments(query)
  const columns = useMemo(() => installmentColumns, [])

  const clear = () => {
    setDates({})
    setQuery(defaultInstallmentListQuery)
  }
  const filtered =
    Boolean(query.statuses?.length) ||
    Boolean(query.search?.trim()) ||
    Boolean(query.dateRange)

  const rows = installments.data?.items ?? []
  const showEmpty =
    !installments.isLoading && !installments.error && rows.length === 0

  return (
    <FinancePage
      title={installmentCopy.title}
      description={financeCopy.description}
      permission={financePermissions.invoicesView}
    >
      <div className="space-y-4">
        <Card>
          <FilterBar>
            <span className="flex flex-col gap-1">
              <label
                htmlFor="installment-status"
                className="text-muted-foreground text-xs"
              >
                {invoiceCopy.status}
              </label>
              <Dropdown
                id="installment-status"
                className="h-10 min-w-44"
                value={query.statuses?.[0] ?? ""}
                options={[{ value: "", label: "الكل" }, ...statusOptions]}
                onChange={(event) =>
                  setQuery((current) => ({
                    ...current,
                    statuses: event.target.value
                      ? [event.target.value as InstallmentStatus]
                      : undefined,
                    page: 1,
                  }))
                }
              />
            </span>
            <DateRangeFilter
              label={invoiceCopy.dueDate}
              value={dates}
              onChange={(next) => {
                setDates(next)
                setQuery((current) => ({
                  ...current,
                  dateRange: toDateRange(next, "dueDate"),
                  page: 1,
                }))
              }}
            />
            {filtered && (
              <Button variant="outline" size="sm" onClick={clear}>
                مسح كل عوامل التصفية
              </Button>
            )}
          </FilterBar>
        </Card>

        <Card>
          {showEmpty ? (
            <EmptyState
              title={installmentCopy.emptyTitle}
              description={
                filtered ? "جرّب تعديل البحث أو إزالة بعض عوامل التصفية." : undefined
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
              loading={installments.isLoading}
              error={installments.error?.message}
              onRetry={() => void installments.refetch()}
              getRowId={(row) => row.id}
              controlled={{
                search: query.search ?? "",
                page: installments.data?.page ?? query.page,
                pageSize: query.pageSize,
                total: installments.data?.total ?? 0,
                totalPages: installments.data?.totalPages ?? 1,
                onSearchChange: (search) =>
                  setQuery((current) => ({ ...current, search, page: 1 })),
                onPageChange: (page) =>
                  setQuery((current) => ({ ...current, page })),
              }}
            />
          )}
        </Card>
      </div>
    </FinancePage>
  )
}
