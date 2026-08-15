"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { StatusBadge } from "@/shared/components/feedback/status-badge"
import { Button } from "@workspace/ui/components/button"
import type {
  ExpenseCategorySummary,
  ExpenseSubCategorySummary,
} from "../types/projections"
import { categoryCopy } from "../config/accounting-copy"

/** Tone is decorative; the Arabic label carries the meaning. */
export function CategoryStatusBadge({ status }: { status: "active" | "archived" }) {
  return (
    <StatusBadge
      label={status === "active" ? categoryCopy.active : categoryCopy.archived}
      tone={status === "active" ? "success" : "neutral"}
    />
  )
}

export interface CategoryRowActions {
  canManage: boolean
  onEdit: (row: ExpenseCategorySummary) => void
  onToggleStatus: (row: ExpenseCategorySummary) => void
}

export function categoryColumns(
  actions: CategoryRowActions
): ColumnDef<ExpenseCategorySummary>[] {
  return [
    {
      id: categoryCopy.name,
      accessorKey: "name",
      header: categoryCopy.name,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      id: categoryCopy.description,
      accessorKey: "description",
      header: categoryCopy.description,
      cell: ({ row }) => (
        <span className="text-muted-foreground line-clamp-2">
          {row.original.description || "—"}
        </span>
      ),
    },
    {
      id: categoryCopy.subTitle,
      accessorKey: "subCategoryCount",
      header: categoryCopy.subTitle,
      cell: ({ row }) => <bdi dir="ltr">{row.original.subCategoryCount}</bdi>,
    },
    {
      id: categoryCopy.status,
      accessorKey: "status",
      header: categoryCopy.status,
      cell: ({ row }) => <CategoryStatusBadge status={row.original.status} />,
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) =>
        actions.canManage ? (
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => actions.onEdit(row.original)}>
              تعديل
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => actions.onToggleStatus(row.original)}
            >
              {row.original.status === "active"
                ? categoryCopy.archive
                : categoryCopy.activate}
            </Button>
          </div>
        ) : null,
    },
  ]
}

export interface SubCategoryRowActions {
  canManage: boolean
  onEdit: (row: ExpenseSubCategorySummary) => void
  onToggleStatus: (row: ExpenseSubCategorySummary) => void
}

export function subCategoryColumns(
  actions: SubCategoryRowActions
): ColumnDef<ExpenseSubCategorySummary>[] {
  return [
    {
      id: categoryCopy.name,
      accessorKey: "name",
      header: categoryCopy.name,
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      id: categoryCopy.parent,
      accessorKey: "categoryLabel",
      header: categoryCopy.parent,
    },
    {
      id: categoryCopy.description,
      accessorKey: "description",
      header: categoryCopy.description,
      cell: ({ row }) => (
        <span className="text-muted-foreground line-clamp-2">
          {row.original.description || "—"}
        </span>
      ),
    },
    {
      id: categoryCopy.status,
      accessorKey: "status",
      header: categoryCopy.status,
      cell: ({ row }) => <CategoryStatusBadge status={row.original.status} />,
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) =>
        actions.canManage ? (
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => actions.onEdit(row.original)}>
              تعديل
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => actions.onToggleStatus(row.original)}
            >
              {row.original.status === "active"
                ? categoryCopy.archive
                : categoryCopy.activate}
            </Button>
          </div>
        ) : null,
    },
  ]
}
