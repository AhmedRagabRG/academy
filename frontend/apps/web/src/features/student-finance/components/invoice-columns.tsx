"use client"

import Link from "next/link"
import type { ColumnDef } from "@tanstack/react-table"
import type { InvoiceSummary } from "../types/projections"
import { invoiceCopy } from "../config/finance-copy"
import { FinanceBidiValue } from "./finance-area-states"
import { MoneyValue } from "./money-value"
import { InvoiceStatusBadge } from "./invoice-status-badge"

const dateFormatter = new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" })

const formatDate = (value?: string) => {
  if (!value) return "—"
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? "—" : dateFormatter.format(parsed)
}

/**
 * Module-level constants so the table never re-creates columns per render.
 * Invoice numbers, dates, and money are bidi-isolated inside Arabic layout.
 */
export const invoiceColumns: ColumnDef<InvoiceSummary>[] = [
  {
    id: invoiceCopy.number,
    accessorKey: "invoiceNumber",
    header: invoiceCopy.number,
    cell: ({ row }) => (
      <Link
        href={`/student-finance/invoices/${row.original.id}`}
        className="focus-visible:ring-ring rounded font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2"
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
    id: invoiceCopy.offering,
    accessorKey: "offeringLabel",
    header: invoiceCopy.offering,
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate">{row.original.offeringLabel}</p>
        {row.original.batchLabel && (
          <p className="text-muted-foreground truncate text-xs">
            {row.original.batchLabel}
          </p>
        )}
      </div>
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
    id: invoiceCopy.finalAmount,
    accessorKey: "finalAmount",
    header: invoiceCopy.finalAmount,
    cell: ({ row }) => <MoneyValue value={row.original.finalAmount} />,
  },
  {
    id: invoiceCopy.paidAmount,
    accessorKey: "paidAmount",
    header: invoiceCopy.paidAmount,
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
    cell: ({ row }) => <InvoiceStatusBadge status={row.original.status} />,
  },
]
