import type { Metadata } from "next"
import { StudentNotesScreen } from "@/features/students"

export const metadata: Metadata = { title: "ملاحظات الطالب" }

export default async function Page({
  params,
}: {
  params: Promise<{ studentId: string }>
}) {
  const { studentId } = await params
  return <StudentNotesScreen studentId={studentId} />
}
