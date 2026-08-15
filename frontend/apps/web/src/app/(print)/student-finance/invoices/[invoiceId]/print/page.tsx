import type { Metadata } from "next"
import { InvoicePrintScreen } from "@/features/student-finance"

export const metadata: Metadata = { title: "طباعة الفاتورة" }

export default async function InvoicePrintPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>
}) {
  const { invoiceId } = await params
  return <InvoicePrintScreen invoiceId={invoiceId} />
}
