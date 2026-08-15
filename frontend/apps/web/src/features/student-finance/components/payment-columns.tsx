"use client"

import Link from "next/link"
import type { ColumnDef } from "@tanstack/react-table"
import type { PaymentSummary } from "../types/projections"
import { invoiceCopy, paymentCopy } from "../config/finance-copy"
import { FinanceBidiValue } from "./finance-area-states"
import { MoneyValue } from "./money-value"

const dateFormatter = new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" })
const formatDate = (value: string) => {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? "—" : dateFormatter.format(parsed)
}

export const paymentColumns: ColumnDef<PaymentSummary>[] = [
  {
    id: paymentCopy.receiptNumber,
    accessorKey: "receiptNumber",
    header: paymentCopy.receiptNumber,
    cell: ({ row }) => (
      <FinanceBidiValue className="font-medium">
        {row.original.receiptNumber}
      </FinanceBidiValue>
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
    id: paymentCopy.method,
    accessorKey: "methodLabel",
    header: paymentCopy.method,
  },
  {
    id: paymentCopy.paymentDate,
    accessorKey: "paymentDate",
    header: paymentCopy.paymentDate,
    cell: ({ row }) => (
      <FinanceBidiValue>{formatDate(row.original.paymentDate)}</FinanceBidiValue>
    ),
  },
  {
    id: paymentCopy.amount,
    accessorKey: "amount",
    header: paymentCopy.amount,
    cell: ({ row }) => <MoneyValue value={row.original.amount} emphasis />,
  },
  {
    id: "سجّلها",
    accessorKey: "recordedByName",
    header: "سجّلها",
  },
]
