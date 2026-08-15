"use client"
import type { ColumnDef } from "@tanstack/react-table"
import Link from "next/link"
import { Pencil } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import type { BatchSummary } from "../types/domain"
import { BatchStatusBadge } from "./batch-status-badge"
import { BatchCapacityIndicator } from "./batch-capacity-indicator"
import { BatchPermission } from "./program-batch-permission-boundary"
export const batchColumns = (programId: string): ColumnDef<BatchSummary>[] => [
  {
    accessorKey: "name",
    header: "الدفعة",
    cell: ({ row }) => (
      <div className="flex min-w-48 flex-col items-start gap-1 text-start">
        <Link
          className="font-heading text-[0.95rem] font-bold text-brand-navy underline-offset-4 transition-colors hover:text-brand-blue hover:underline dark:text-foreground"
          href={`/academic-catalog/programs/${programId}/batches/${row.original.id}`}
        >
          {row.original.name}
        </Link>
        <p className="text-start text-xs font-medium tracking-wide text-muted-foreground">
          <bdi dir="ltr">{row.original.code}</bdi>
        </p>
      </div>
    ),
  },
  { accessorKey: "academicYear", header: "العام الأكاديمي" },
  { accessorKey: "intake", header: "فترة القبول" },
  {
    accessorKey: "status",
    header: "الحالة",
    cell: ({ row }) => <BatchStatusBadge status={row.original.status} />,
  },
  {
    id: "capacity",
    header: "السعة",
    cell: ({ row }) => (
      <BatchCapacityIndicator capacity={row.original.capacity} />
    ),
  },
  {
    id: "actions",
    header: "الإجراءات",
    cell: ({ row }) => (
      <BatchPermission permission="batches.update">
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          className="text-brand-blue hover:text-brand-navy"
          render={
            <Link
              href={`/academic-catalog/programs/${programId}/batches/${row.original.id}/edit`}
            />
          }
        >
          <Pencil aria-hidden="true" />
          تعديل
        </Button>
      </BatchPermission>
    ),
  },
]
