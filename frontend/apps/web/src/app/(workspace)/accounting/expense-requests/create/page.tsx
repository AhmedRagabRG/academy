import type { Metadata } from "next"
import { CreateExpenseRequestScreen } from "@/features/accounting"

export const metadata: Metadata = { title: "إنشاء طلب مصروفات" }

export default function Page() {
  return <CreateExpenseRequestScreen />
}
