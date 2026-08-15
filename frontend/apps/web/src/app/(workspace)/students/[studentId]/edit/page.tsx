import type { Metadata } from "next"
import { EditStudentScreen } from "@/features/students"

export const metadata: Metadata = { title: "تعديل بيانات الطالب" }

export default async function EditStudentPage({
  params,
}: {
  params: Promise<{ studentId: string }>
}) {
  const { studentId } = await params
  return <EditStudentScreen studentId={studentId} />
}
