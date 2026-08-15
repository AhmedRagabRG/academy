"use client"

import Link from "next/link"
import type { ColumnDef } from "@tanstack/react-table"
import type { StudentSummary } from "../types/projections"
import { studentFieldsCopy } from "../config/students-copy"
import { StudentStatusBadge } from "./student-status-badge"
import { StudentBidiValue } from "./student-area-states"

const dateFormatter = new Intl.DateTimeFormat("ar-EG", {
  dateStyle: "medium",
})

const formatDate = (value: string) => {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? "—" : dateFormatter.format(parsed)
}

/**
 * Column definitions are module-level constants so the table never re-creates them
 * per render. Codes, phones, and dates are bidi-isolated inside Arabic layout.
 */
export const studentColumns: ColumnDef<StudentSummary>[] = [
  {
    id: studentFieldsCopy.studentCode,
    accessorKey: "studentCode",
    header: studentFieldsCopy.studentCode,
    cell: ({ row }) => (
      <Link
        href={`/students/${row.original.id}`}
        className="focus-visible:ring-ring rounded font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2"
      >
        <StudentBidiValue>{row.original.studentCode}</StudentBidiValue>
      </Link>
    ),
  },
  {
    id: studentFieldsCopy.fullName,
    accessorKey: "fullName",
    header: studentFieldsCopy.fullName,
  },
  {
    id: studentFieldsCopy.primaryPhone,
    accessorKey: "phoneHint",
    header: studentFieldsCopy.primaryPhone,
    enableSorting: false,
    cell: ({ row }) => (
      <StudentBidiValue>{row.original.phoneHint}</StudentBidiValue>
    ),
  },
  {
    id: studentFieldsCopy.registrationBranch,
    accessorKey: "registrationBranchLabel",
    header: studentFieldsCopy.registrationBranch,
  },
  {
    id: studentFieldsCopy.department,
    accessorKey: "departmentLabel",
    header: studentFieldsCopy.department,
  },
  {
    id: "المنتج الأكاديمي",
    accessorKey: "primaryOfferingLabel",
    header: "المنتج الأكاديمي",
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate">{row.original.primaryOfferingLabel}</p>
        {row.original.primaryBatchLabel && (
          <p className="text-muted-foreground truncate text-xs">
            {row.original.primaryBatchLabel}
          </p>
        )}
      </div>
    ),
  },
  {
    id: studentFieldsCopy.customerServiceEmployee,
    accessorKey: "customerServiceEmployeeName",
    header: studentFieldsCopy.customerServiceEmployee,
  },
  {
    id: studentFieldsCopy.enrollmentCount,
    accessorKey: "enrollmentCount",
    header: studentFieldsCopy.enrollmentCount,
  },
  {
    id: studentFieldsCopy.status,
    accessorKey: "status",
    header: studentFieldsCopy.status,
    cell: ({ row }) => <StudentStatusBadge status={row.original.status} />,
  },
  {
    id: studentFieldsCopy.updatedAt,
    accessorKey: "updatedAt",
    header: studentFieldsCopy.updatedAt,
    cell: ({ row }) => (
      <StudentBidiValue>{formatDate(row.original.updatedAt)}</StudentBidiValue>
    ),
  },
]
