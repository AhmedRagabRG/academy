import type { Metadata } from "next"
import { ExpenseRequestsScreen } from "@/features/accounting"

export const metadata: Metadata = { title: "طلبات المصروفات" }

export default function Page() {
  return <ExpenseRequestsScreen />
}
