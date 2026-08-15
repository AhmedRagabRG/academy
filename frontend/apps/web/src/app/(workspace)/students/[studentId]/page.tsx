import type { Metadata } from "next"
import { StudentOverviewScreen } from "@/features/students"

export const metadata: Metadata = { title: "ملف الطالب" }

export default async function StudentOverviewPage({
  params,
}: {
  params: Promise<{ studentId: string }>
}) {
  const { studentId } = await params
  return <StudentOverviewScreen studentId={studentId} />
}
