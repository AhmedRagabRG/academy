import type { Metadata } from "next"
import { RefundsScreen } from "@/features/student-finance"

export const metadata: Metadata = { title: "المستردات" }

export default function Page() {
  return <RefundsScreen />
}
