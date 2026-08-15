"use client"
import Link from "next/link"
import type { ColumnDef } from "@tanstack/react-table"
import { Button } from "@workspace/ui/components/button"
import { StatusBadge } from "@/shared/components/feedback/status-badge"
import { formatMoney } from "@/shared/utils/money"
import { BidiValue } from "../components/bidi-value"
import type { ProductSummary } from "../types/domain"
const labels = {
  draft: "مسودة",
  active: "نشط",
  hidden: "مخفي",
  closed: "مغلق",
  archived: "مؤرشف",
}
export const productColumns: ColumnDef<ProductSummary>[] = [
  {
    accessorKey: "officialName",
    header: "المنتج",
    cell: ({ row }) => (
      <div>
        <Link
          href={`/academic-catalog/products/${row.original.id}`}
          className="font-medium text-brand-navy hover:underline dark:text-foreground"
        >
          {row.original.officialName}
        </Link>
        <div className="mt-1">
          <BidiValue>{row.original.code}</BidiValue>
        </div>
      </div>
    ),
  },
  { accessorKey: "typeName", header: "النوع" },
  { accessorKey: "categoryName", header: "التصنيف" },
  {
    id: "price",
    header: "السعر",
    cell: ({ row }) => (
      <BidiValue>{formatMoney(row.original.basePrice)}</BidiValue>
    ),
  },
  { accessorKey: "branchCount", header: "الفروع" },
  {
    accessorKey: "status",
    header: "الحالة",
    cell: ({ row }) => (
      <StatusBadge
        label={labels[row.original.status]}
        tone={
          row.original.status === "active"
            ? "success"
            : row.original.status === "archived"
              ? "danger"
              : "warning"
        }
      />
    ),
  },
  {
    id: "actions",
    header: "إجراءات",
    cell: ({ row }) => (
      <Button
        variant="ghost"
        nativeButton={false}
        render={
          <Link href={`/academic-catalog/products/${row.original.id}/edit`} />
        }
      >
        تعديل
      </Button>
    ),
  },
]
