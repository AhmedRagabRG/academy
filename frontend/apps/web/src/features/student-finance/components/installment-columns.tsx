"use client"

import Link from "next/link"
import type { ColumnDef } from "@tanstack/react-table"
import type { InstallmentSummary } from "../types/projections"
import { installmentCopy, invoiceCopy } from "../config/finance-copy"
import { FinanceBidiValue } from "./finance-area-states"
import { MoneyValue } from "./money-value"
import { InstallmentStatusBadge } from "./invoice-status-badge"

const dateFormatter = new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" })
const formatDate = (value: string) => {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? "—" : dateFormatter.format(parsed)
}

export const installmentColumns: ColumnDef<InstallmentSummary>[] = [
  {
    id: invoiceCopy.number,
    accessorKey: "invoiceNumber",
    header: invoiceCopy.number,
    cell: ({ row }) => (
      <Link
        href={`/student-finance/invoices/${row.original.invoiceId}`}
        className="focus-visible:ring-ring rounded underline-offset-4 outline-none hover:underline focus-visible:ring-2"
      >
        <FinanceBidiValue>{row.original.invoiceNumber}</FinanceBidiValue>
      </Link>
    ),
  },
  {
    id: invoiceCopy.student,
    accessorKey: "studentName",
    header: invoiceCopy.student,
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate">{row.original.studentName}</p>
        <p className="text-muted-foreground truncate text-xs">
          <FinanceBidiValue>{row.original.studentCode}</FinanceBidiValue>
        </p>
      </div>
    ),
  },
  {
    id: installmentCopy.sequence,
    accessorKey: "sequence",
    header: installmentCopy.sequence,
    cell: ({ row }) => (
      <FinanceBidiValue>{row.original.sequence}</FinanceBidiValue>
    ),
  },
  {
    id: invoiceCopy.dueDate,
    accessorKey: "dueDate",
    header: invoiceCopy.dueDate,
    cell: ({ row }) => (
      <FinanceBidiValue>{formatDate(row.original.dueDate)}</FinanceBidiValue>
    ),
  },
  {
    id: installmentCopy.amount,
    accessorKey: "amount",
    header: installmentCopy.amount,
    cell: ({ row }) => <MoneyValue value={row.original.amount} />,
  },
  {
    id: installmentCopy.paid,
    accessorKey: "paidAmount",
    header: installmentCopy.paid,
    cell: ({ row }) => <MoneyValue value={row.original.paidAmount} />,
  },
  {
    id: invoiceCopy.remaining,
    accessorKey: "remaining",
    header: invoiceCopy.remaining,
    cell: ({ row }) => <MoneyValue value={row.original.remaining} emphasis />,
  },
  {
    id: invoiceCopy.status,
    accessorKey: "status",
    header: invoiceCopy.status,
    cell: ({ row }) => <InstallmentStatusBadge status={row.original.status} />,
  },
]
