"use client"
import { useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@workspace/ui/components/button"
import { Card } from "@/shared/components/layout/card"
import { DataTable } from "@/shared/components/data-table/data-table"
import type { ProgramId } from "../types/common"
import type { BatchListQuery } from "../types/commands"
import { defaultBatchQuery } from "../utils/batch-list-query"
import { ProgramBatchPage } from "../components/program-batch-page"
import { BatchPermission } from "../components/program-batch-permission-boundary"
import { ProgramBatchToolbar } from "../components/program-batch-toolbar"
import { batchColumns } from "../components/program-batch-columns"
import { useBatches, useBatchLookups } from "../hooks/use-program-batches"
export function ProgramBatchesScreen({
  programId: raw,
}: {
  programId: string
}) {
  const programId = raw as ProgramId,
    [query, setQuery] = useState<BatchListQuery>(defaultBatchQuery),
    lookups = useBatchLookups(programId),
    batches = useBatches(programId, query),
    columns = useMemo(() => batchColumns(programId), [programId])
  const exportRows = () => {
    const rows = batches.data?.items ?? []
    const csv = [
      "name,code,status",
      ...rows.map((row) => `"${row.name}",${row.code},${row.status}`),
    ].join("\n")
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" })
    )
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "program-batches.csv"
    anchor.click()
    URL.revokeObjectURL(url)
  }
  return (
    <ProgramBatchPage
      title="دفعات البرنامج"
      description="إدارة الجداول والسعة والأسعار ودورة حياة كل دفعة."
      actions={
        <BatchPermission permission="batches.create">
          <Button
            nativeButton={false}
            render={
              <Link
                href={`/academic-catalog/programs/${programId}/batches/create`}
              />
            }
          >
            إنشاء دفعة
          </Button>
        </BatchPermission>
      }
    >
      <div className="space-y-4">
        {lookups.data && (
          <Card>
            <ProgramBatchToolbar
              query={query}
              lookups={lookups.data}
              onChange={(patch) => setQuery((q) => ({ ...q, ...patch }))}
              onExport={exportRows}
            />
          </Card>
        )}
        <Card>
          <DataTable
            data={batches.data?.items ?? []}
            columns={columns}
            loading={batches.isLoading}
            error={batches.error?.message}
            onRetry={() => void batches.refetch()}
            getRowId={(row) => row.id}
            controlled={{
              search: query.search ?? "",
              page: batches.data?.page ?? query.page,
              pageSize: query.pageSize,
              total: batches.data?.total ?? 0,
              totalPages: batches.data?.totalPages ?? 1,
              onSearchChange: (search) =>
                setQuery((q) => ({ ...q, search, page: 1 })),
              onPageChange: (page) => setQuery((q) => ({ ...q, page })),
            }}
          />
        </Card>
      </div>
    </ProgramBatchPage>
  )
}
