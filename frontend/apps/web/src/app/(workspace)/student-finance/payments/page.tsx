import type { Metadata } from "next"
import { PaymentsScreen } from "@/features/student-finance"

export const metadata: Metadata = { title: "المدفوعات" }

export default function Page() {
  return <PaymentsScreen />
}
