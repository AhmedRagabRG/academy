import type { Metadata } from "next"
import { StudentDocumentsScreen } from "@/features/students"

export const metadata: Metadata = { title: "مستندات الطالب" }

export default async function Page({
  params,
}: {
  params: Promise<{ studentId: string }>
}) {
  const { studentId } = await params
  return <StudentDocumentsScreen studentId={studentId} />
}
