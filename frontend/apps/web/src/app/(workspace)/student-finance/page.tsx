import type { Metadata } from "next"
import { FinanceDashboardScreen } from "@/features/student-finance"

export const metadata: Metadata = {
  title: "الشؤون المالية للطلاب",
  description: "لوحة متابعة الفواتير والتحصيل والأرصدة المستحقة.",
}

export default function StudentFinancePage() {
  return <FinanceDashboardScreen />
}
