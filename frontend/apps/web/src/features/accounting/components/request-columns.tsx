"use client"

import Link from "next/link"
import { Paperclip } from "lucide-react"
import type { ColumnDef } from "@tanstack/react-table"
import { formatMoney } from "@/shared/utils/money"
import type { ExpenseRequestSummary } from "../types/projections"
import { requestCopy } from "../config/accounting-copy"
import { AccountingBidiValue } from "./accounting-area-states"
import { ExpenseStatusBadge } from "./expense-status-badge"

const dateFormatter = new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" })
const formatDate = (value: string) => {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? "—" : dateFormatter.format(parsed)
}

export const requestColumns: ColumnDef<ExpenseRequestSummary>[] = [
  {
    id: requestCopy.number,
    accessorKey: "requestNumber",
    header: requestCopy.number,
    cell: ({ row }) => (
      <Link
        href={`/accounting/expense-requests/${row.original.id}`}
        className="focus-visible:ring-ring rounded underline-offset-4 outline-none hover:underline focus-visible:ring-2"
      >
        <AccountingBidiValue className="font-medium">
          {row.original.requestNumber}
        </AccountingBidiValue>
      </Link>
    ),
  },
  {
    id: requestCopy.requestDate,
    accessorKey: "requestDate",
    header: requestCopy.requestDate,
    cell: ({ row }) => (
      <AccountingBidiValue>{formatDate(row.original.requestDate)}</AccountingBidiValue>
    ),
  },
  {
    id: requestCopy.branch,
    accessorKey: "branchLabel",
    header: requestCopy.branch,
  },
  {
    id: requestCopy.requestedBy,
    accessorKey: "requesterName",
    header: requestCopy.requestedBy,
  },
  {
    id: requestCopy.category,
    accessorKey: "categoryLabel",
    header: requestCopy.category,
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate">{row.original.categoryLabel}</p>
        {row.original.subCategoryLabel && (
          <p className="text-muted-foreground truncate text-xs">
            {row.original.subCategoryLabel}
          </p>
        )}
      </div>
    ),
  },
  {
    id: requestCopy.amount,
    accessorKey: "amount",
    header: requestCopy.amount,
    cell: ({ row }) => (
      // Money is a mixed-direction value inside Arabic layout; without isolation
      // the surrounding text reorders its digits.
      <AccountingBidiValue className="font-medium">
        {formatMoney(row.original.amount)}
      </AccountingBidiValue>
    ),
  },
  {
    id: requestCopy.attachments,
    accessorKey: "attachmentCount",
    header: requestCopy.attachments,
    cell: ({ row }) =>
      row.original.attachmentCount > 0 ? (
        <span className="text-muted-foreground inline-flex items-center gap-1 text-sm">
          <Paperclip className="size-3.5" aria-hidden />
          <AccountingBidiValue>{row.original.attachmentCount}</AccountingBidiValue>
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: requestCopy.status,
    accessorKey: "status",
    header: requestCopy.status,
    cell: ({ row }) => <ExpenseStatusBadge status={row.original.status} />,
  },
]
