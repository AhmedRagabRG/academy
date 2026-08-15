import type { Metadata } from "next"
import { InvoiceDetailScreen } from "@/features/student-finance"

export const metadata: Metadata = { title: "تفاصيل الفاتورة" }

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>
}) {
  const { invoiceId } = await params
  return <InvoiceDetailScreen invoiceId={invoiceId} />
}
