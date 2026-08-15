"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@workspace/ui/components/button"
import { PageContainer } from "@/shared/components/layout/page-container"
import { PageHeader } from "@/shared/components/layout/page-header"
import { Card } from "@/shared/components/layout/card"
import {
  DataTable,
  type BulkAction,
} from "@/shared/components/data-table/data-table"
import { usePermission } from "@/shared/hooks/use-permission"
import type { ExpenseRequestListQuery } from "../types/commands"
import type { ExpenseRequestSummary } from "../types/projections"
import { accountingCopy, bulkCopy, requestCopy } from "../config/accounting-copy"
import { accountingPermissions } from "../config/accounting-permissions"
import {
  defaultRequestListQuery,
  hasActiveRequestFilters,
} from "../utils/accounting-list-query"
import { isEditable } from "../utils/expense-lifecycle"
import { useAccountingLookups } from "../hooks/use-accounting-lookups"
import { useExpenseRequests } from "../hooks/use-expense-requests-list"
import { useSubmitRequest } from "../hooks/use-expense-requests"
import { useDecideRequest } from "../hooks/use-request-decisions"
import { requestColumns } from "../components/request-columns"
import { RequestFilterToolbar } from "../components/request-filter-toolbar"
import {
  AccountingAreaState,
  AccountingEmptyState,
} from "../components/accounting-area-states"

export function ExpenseRequestsScreen() {
  const [query, setQuery] = useState<ExpenseRequestListQuery>(defaultRequestListQuery)
  const requests = useExpenseRequests(query)
  const lookups = useAccountingLookups()
  const submit = useSubmitRequest()
  const decide = useDecideRequest()

  const canCreate = usePermission(accountingPermissions.requestsCreate)
  const canSubmit = usePermission(accountingPermissions.requestsSubmit)
  const canDecide = usePermission(accountingPermissions.requestsDecide)

  const columns = useMemo(() => requestColumns, [])
  const rows = requests.data?.items ?? []
  const filtered = hasActiveRequestFilters(query)
  const showEmpty = !requests.isLoading && !requests.error && rows.length === 0

  /**
   * Named bulk actions.
   *
   * Each reports its own outcome per row rather than failing the whole batch
   * silently — a row that cannot take the action is not an error for the rows
   * that can, and the user is told how many were skipped.
   */
  const runBatch = (
    selected: ExpenseRequestSummary[],
    eligible: (row: ExpenseRequestSummary) => boolean,
    run: (row: ExpenseRequestSummary) => void
  ) => {
    const applicable = selected.filter(eligible)
    const skipped = selected.length - applicable.length
    for (const row of applicable) run(row)
    if (skipped > 0) toast.info(bulkCopy.partialOutcome)
  }

  const bulkActions: BulkAction<ExpenseRequestSummary>[] = [
    {
      id: "submit",
      label: bulkCopy.submitSelected,
      hidden: !canSubmit,
      run: (selected) =>
        runBatch(
          selected,
          (row) => isEditable(row.status),
          (row) => submit.mutate({ requestId: row.id, expectedVersion: row.version })
        ),
    },
    {
      id: "approve",
      label: bulkCopy.approveSelected,
      hidden: !canDecide,
      run: (selected) =>
        runBatch(
          selected,
          (row) => row.status === "under-review",
          (row) =>
            decide.mutate({
              requestId: row.id,
              decision: "approved",
              expectedVersion: row.version,
            })
        ),
    },
  ]

  return (
    <PageContainer>
      <PageHeader
        title={requestCopy.title}
        description={accountingCopy.description}
        actions={
          canCreate && (
            <Button
              nativeButton={false}
              render={<Link href="/accounting/expense-requests/create" />}
            >
              <Plus aria-hidden />
              {requestCopy.create}
            </Button>
          )
        }
      />

      <AccountingAreaState
        permission={accountingPermissions.requestsView}
        loading={requests.isLoading}
        error={requests.error}
        onRetry={() => void requests.refetch()}
        loadingLabel="جارٍ تحميل طلبات المصروفات"
      >
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm">
            {accountingCopy.noDeleteNotice}
          </p>

          <RequestFilterToolbar
            query={query}
            branches={lookups.data?.branches ?? []}
            categories={(lookups.data?.categories ?? []).map((category) => ({
              value: category.id,
              label: category.name,
            }))}
            requesters={lookups.data?.requesters ?? []}
            onChange={setQuery}
            onClear={() => setQuery(defaultRequestListQuery)}
          />

          <Card>
            {showEmpty ? (
              <AccountingEmptyState
                filtered={filtered}
                emptyTitle={requestCopy.emptyAllTitle}
                emptyDescription={requestCopy.emptyAllDescription}
                filteredTitle={requestCopy.emptyTitle}
                onClearFilters={() => setQuery(defaultRequestListQuery)}
              />
            ) : (
              <DataTable
                data={rows}
                columns={columns}
                getRowId={(row) => row.id}
                bulkActions={bulkActions}
                controlled={{
                  search: query.search ?? "",
                  page: requests.data?.page ?? query.page,
                  pageSize: query.pageSize,
                  total: requests.data?.total ?? 0,
                  totalPages: requests.data?.totalPages ?? 1,
                  onSearchChange: (search) =>
                    setQuery((current) => ({ ...current, search, page: 1 })),
                  onPageChange: (page) =>
                    setQuery((current) => ({ ...current, page })),
                }}
              />
            )}
          </Card>
        </div>
      </AccountingAreaState>
    </PageContainer>
  )
}
