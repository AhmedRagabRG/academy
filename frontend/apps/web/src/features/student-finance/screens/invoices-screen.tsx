"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Download, FilePlus } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@/shared/components/layout/card"
import { DataTable } from "@/shared/components/data-table/data-table"
import { EmptyState } from "@/shared/components/states/empty-state"
import type { InvoiceListQuery } from "../types/commands"
import {
  defaultInvoiceListQuery,
  hasActiveFilters,
} from "../utils/finance-list-query"
import { financeCopy, invoiceCopy } from "../config/finance-copy"
import { financePermissions } from "../config/finance-permissions"
import {
  useExportInvoices,
  useFinanceLookups,
  useInvoices,
} from "../hooks/use-invoices"
import { invoiceColumns } from "../components/invoice-columns"
import { FinancePage } from "../components/finance-page"
import { FinancePermission } from "../components/finance-area-states"
import { FinanceToolbar, toFilterOptions } from "../components/finance-toolbar"
import {
  toDateRange,
  type DateRangeValue,
} from "../components/date-range-filter"

export function InvoicesScreen() {
  const [query, setQuery] = useState<InvoiceListQuery>(defaultInvoiceListQuery)
  const [dates, setDates] = useState<DateRangeValue>({})
  const invoices = useInvoices(query)
  const lookups = useFinanceLookups()
  const exportInvoices = useExportInvoices()

  const columns = useMemo(() => invoiceColumns, [])
  const patch = (next: Partial<InvoiceListQuery>) =>
    setQuery((current) => ({ ...current, ...next }))

  const rows = invoices.data?.items ?? []
  const filtered = hasActiveFilters(query)
  const showEmpty = !invoices.isLoading && !invoices.error && rows.length === 0

  return (
    <FinancePage
      title={invoiceCopy.title}
      description={financeCopy.description}
      permission={financePermissions.invoicesView}
      actions={
        <div className="flex flex-wrap gap-2">
          <FinancePermission permission={financePermissions.export}>
            <Button
              variant="outline"
              onClick={() => exportInvoices.mutate(query)}
            >
              <Download aria-hidden />
              {financeCopy.export}
            </Button>
          </FinancePermission>
          <FinancePermission permission={financePermissions.invoicesCreate}>
            <Button
              nativeButton={false}
              render={<Link href="/student-finance/invoices/create" />}
            >
              <FilePlus aria-hidden />
              {invoiceCopy.create}
            </Button>
          </FinancePermission>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {financeCopy.noDeleteNotice}
        </p>

        <Card>
          <FinanceToolbar
            groups={[
              {
                id: "status",
                label: invoiceCopy.status,
                options:
                  lookups.data?.invoiceStatuses.map((status) => ({
                    value: status.value,
                    label: status.label,
                  })) ?? [],
                selected: query.statuses ?? [],
                onChange: (statuses) =>
                  patch({
                    statuses: statuses as InvoiceListQuery["statuses"],
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
              {
                id: "offering",
                label: invoiceCopy.offering,
                options: toFilterOptions(lookups.data?.offerings ?? []),
                selected: query.offeringIds ?? [],
                onChange: (offeringIds) => patch({ offeringIds, page: 1 }),
              },
            ]}
            dateLabel={invoiceCopy.issueDate}
            dateValue={dates}
            onDateChange={(next) => {
              setDates(next)
              patch({ dateRange: toDateRange(next, "issueDate"), page: 1 })
            }}
            onClear={() => {
              setDates({})
              setQuery(defaultInvoiceListQuery)
            }}
          />
        </Card>
        <Card>
          {showEmpty ? (
            <EmptyState
              title={invoiceCopy.emptyTitle}
              description={
                filtered
                  ? invoiceCopy.emptyDescription
                  : financeCopy.noDeleteNotice
              }
              action={
                filtered ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDates({})
                      setQuery(defaultInvoiceListQuery)
                    }}
                  >
                    مسح كل عوامل التصفية
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <DataTable
              data={rows}
              columns={columns}
              loading={invoices.isLoading}
              error={invoices.error?.message}
              onRetry={() => void invoices.refetch()}
              getRowId={(row) => row.id}
              controlled={{
                search: query.search ?? "",
                page: invoices.data?.page ?? query.page,
                pageSize: query.pageSize,
                total: invoices.data?.total ?? 0,
                totalPages: invoices.data?.totalPages ?? 1,
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
