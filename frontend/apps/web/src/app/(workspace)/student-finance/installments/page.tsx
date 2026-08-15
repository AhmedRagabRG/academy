import type { Metadata } from "next"
import { InstallmentsScreen } from "@/features/student-finance"

export const metadata: Metadata = { title: "الأقساط" }

export default function InstallmentsPage() {
  return <InstallmentsScreen />
}
