"use client"

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table"
import { useEffect, useState } from "react"
import { Button } from "@workspace/ui/components/button"
import { EmptyState } from "../states/empty-state"
import { ErrorState } from "../states/error-state"
import { LoadingState } from "../states/loading-state"
import { SearchBar } from "./search-bar"

export interface ControlledTableState {
  search: string
  page: number
  pageSize: number
  total: number
  totalPages: number
  onSearchChange: (value: string) => void
  onPageChange: (page: number) => void
}

/**
 * A bulk action the table offers over the selected rows.
 *
 * Named, because a table offering more than one bulk action cannot say which is
 * about to run from a single generic button — and on an approval queue an
 * ambiguous bulk button is a real hazard.
 */
export interface BulkAction<T> {
  id: string
  label: string
  run: (rows: T[]) => void
  /** Hidden entirely when the acting user may not perform it. */
  hidden?: boolean
  disabled?: boolean
}

interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  loading?: boolean
  error?: string
  onRetry?: () => void
  /** The original single-action surface. Still supported; unchanged. */
  onBulkAction?: (rows: T[]) => void
  /** Several named actions, rendered as one button each. */
  bulkActions?: BulkAction<T>[]
  getRowId?: (row: T) => string
  controlled?: ControlledTableState
}

export function DataTable<T>({
  data,
  columns,
  loading = false,
  error,
  onRetry,
  onBulkAction,
  bulkActions,
  getRowId,
  controlled,
}: DataTableProps<T>) {
  const [localSearch, setLocalSearch] = useState("")
  const [sorting, setSorting] = useState<SortingState>([])
  const [visibility, setVisibility] = useState<VisibilityState>({})
  const [selection, setSelection] = useState<RowSelectionState>({})
  const search = controlled?.search ?? localSearch
  useEffect(() => setSelection({}), [data])

  // TanStack Table intentionally exposes a mutable facade; state remains controlled here.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getRowId,
    state: {
      globalFilter: controlled ? undefined : search,
      sorting,
      columnVisibility: visibility,
      rowSelection: selection,
    },
    onGlobalFilterChange: controlled ? undefined : setLocalSearch,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setVisibility,
    onRowSelectionChange: setSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: controlled ? undefined : getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: controlled ? undefined : getPaginationRowModel(),
    manualPagination: Boolean(controlled),
    pageCount: controlled?.totalPages,
    enableRowSelection: true,
  })

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={onRetry} />
  const selectedRows = table
    .getSelectedRowModel()
    .rows.map((row) => row.original)
  const page = controlled?.page ?? table.getState().pagination.pageIndex + 1
  const totalPages = controlled?.totalPages ?? table.getPageCount()

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between gap-3">
        <SearchBar
          value={search}
          onChange={controlled?.onSearchChange ?? setLocalSearch}
        />
        <div className="flex flex-wrap items-center gap-2">
          <details className="relative">
            <summary className="cursor-pointer rounded-lg border border-input px-3 py-2 text-sm">
              الأعمدة
            </summary>
            <div className="absolute end-0 z-10 mt-1 min-w-40 rounded-lg border bg-popover p-2 shadow-lg">
              {table.getAllLeafColumns().map((column) => (
                <label
                  key={column.id}
                  className="flex items-center gap-2 p-1 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={column.getIsVisible()}
                    onChange={column.getToggleVisibilityHandler()}
                  />
                  {column.id}
                </label>
              ))}
            </div>
          </details>
          {onBulkAction && (
            <Button
              variant="outline"
              disabled={selectedRows.length === 0}
              onClick={() => onBulkAction(selectedRows)}
            >
              إجراء جماعي ({selectedRows.length})
            </Button>
          )}
          {bulkActions
            ?.filter((action) => !action.hidden)
            .map((action) => (
              <Button
                key={action.id}
                variant="outline"
                disabled={action.disabled || selectedRows.length === 0}
                onClick={() => action.run(selectedRows)}
              >
                {action.label} ({selectedRows.length})
              </Button>
            ))}
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="bg-muted/50 text-brand-navy dark:text-foreground">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                <th className="w-10 px-3">
                  <input
                    type="checkbox"
                    aria-label="تحديد كل صفوف الصفحة"
                    checked={table.getIsAllPageRowsSelected()}
                    onChange={table.getToggleAllPageRowsSelectedHandler()}
                  />
                </th>
                {group.headers.map((header) => (
                  <th
                    key={header.id}
                    aria-sort={
                      header.column.getIsSorted() === "asc"
                        ? "ascending"
                        : header.column.getIsSorted() === "desc"
                          ? "descending"
                          : "none"
                    }
                    className="px-4 py-3 text-start font-semibold whitespace-nowrap"
                  >
                    <button
                      type="button"
                      disabled={!header.column.getCanSort()}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </button>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                data-state={row.getIsSelected() ? "selected" : undefined}
                className="border-t transition-colors hover:bg-brand-blue/[0.035] data-[state=selected]:bg-brand-blue/[0.06]"
              >
                <td className="px-3 align-middle">
                  <input
                    type="checkbox"
                    aria-label="تحديد الصف"
                    checked={row.getIsSelected()}
                    onChange={row.getToggleSelectedHandler()}
                  />
                </td>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3.5 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {table.getRowModel().rows.length === 0 && (
          <EmptyState
            title="لا توجد بيانات"
            description="جرّب تعديل البحث أو عوامل التصفية."
          />
        )}
      </div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <Button
          variant="outline"
          disabled={page <= 1}
          onClick={() =>
            controlled
              ? controlled.onPageChange(page - 1)
              : table.previousPage()
          }
        >
          السابق
        </Button>
        <span>
          صفحة {page} من {Math.max(1, totalPages)}
          {controlled ? ` · ${controlled.total} سجل` : ""}
        </span>
        <Button
          variant="outline"
          disabled={page >= totalPages}
          onClick={() =>
            controlled ? controlled.onPageChange(page + 1) : table.nextPage()
          }
        >
          التالي
        </Button>
      </div>
    </div>
  )
}
