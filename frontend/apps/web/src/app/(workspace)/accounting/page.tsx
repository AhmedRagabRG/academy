import type { Metadata } from "next"
import { AccountingDashboardScreen } from "@/features/accounting"

export const metadata: Metadata = { title: "لوحة المحاسبة" }

export default function Page() {
  return <AccountingDashboardScreen />
}
