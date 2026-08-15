import type { Metadata } from "next"
import { InvoicesScreen } from "@/features/student-finance"

export const metadata: Metadata = { title: "الفواتير" }

export default function InvoicesPage() {
  return <InvoicesScreen />
}
