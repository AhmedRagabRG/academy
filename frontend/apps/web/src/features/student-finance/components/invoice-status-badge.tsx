import { StatusBadge } from "@/shared/components/feedback/status-badge"
import type {
  FinancialStatus,
  InstallmentStatus,
  InvoiceStatus,
  RefundStatus,
} from "../types/common"
import {
  financialStatusCopy,
  installmentStatusCopy,
  invoiceStatusCopy,
  refundStatusCopy,
} from "../config/finance-copy"

type Tone = "success" | "warning" | "danger" | "neutral"

/** Tone is decorative; the Arabic label always carries the meaning. */
const invoiceTone: Record<InvoiceStatus, Tone> = {
  draft: "neutral",
  issued: "warning",
  "partially-paid": "warning",
  paid: "success",
  cancelled: "neutral",
}

const installmentTone: Record<InstallmentStatus, Tone> = {
  pending: "neutral",
  "partially-paid": "warning",
  paid: "success",
  overdue: "danger",
}

const financialTone: Record<FinancialStatus, Tone> = {
  "no-outstanding-balance": "success",
  "partial-balance": "warning",
  overdue: "danger",
  completed: "success",
}

const refundTone: Record<RefundStatus, Tone> = {
  requested: "warning",
  approved: "warning",
  completed: "success",
  rejected: "danger",
  cancelled: "neutral",
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return <StatusBadge label={invoiceStatusCopy[status]} tone={invoiceTone[status]} />
}

export function InstallmentStatusBadge({ status }: { status: InstallmentStatus }) {
  return (
    <StatusBadge
      label={installmentStatusCopy[status]}
      tone={installmentTone[status]}
    />
  )
}

export function FinancialStatusBadge({ status }: { status: FinancialStatus }) {
  return (
    <StatusBadge label={financialStatusCopy[status]} tone={financialTone[status]} />
  )
}

export function RefundStatusBadge({ status }: { status: RefundStatus }) {
  return <StatusBadge label={refundStatusCopy[status]} tone={refundTone[status]} />
}
