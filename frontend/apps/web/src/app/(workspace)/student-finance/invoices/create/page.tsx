import type { Metadata } from "next"
import { CreateInvoiceScreen } from "@/features/student-finance"

export const metadata: Metadata = { title: "إنشاء فاتورة" }

export default function CreateInvoicePage() {
  return <CreateInvoiceScreen />
}
