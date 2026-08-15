import type { Metadata } from "next"
import { StudentFinanceWorkspaceScreen } from "@/features/student-finance"

export const metadata: Metadata = { title: "الملف المالي للطالب" }

export default async function StudentFinancePage({
  params,
}: {
  params: Promise<{ studentId: string }>
}) {
  const { studentId } = await params
  return <StudentFinanceWorkspaceScreen studentId={studentId} />
}
